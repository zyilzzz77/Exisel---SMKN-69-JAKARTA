package attendance

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/puddle/v2"
)

type ErrorCode string

// Error codes form the shared attendance error contract (see orchestrator
// mapping). Go core must only emit codes from this set.
const (
	ErrQRInvalid                ErrorCode = "QR_INVALID"
	ErrQRExpired                ErrorCode = "QR_EXPIRED"
	ErrAttendanceClosed         ErrorCode = "ATTENDANCE_CLOSED"
	ErrNotExtracurricularMember ErrorCode = "NOT_EXTRACURRICULAR_MEMBER"
	ErrAccountDisabled          ErrorCode = "ACCOUNT_DISABLED"
	ErrUnauthenticated          ErrorCode = "UNAUTHENTICATED"
	ErrDatabaseUnavailable      ErrorCode = "DATABASE_UNAVAILABLE"
	ErrInternalError            ErrorCode = "INTERNAL_ERROR"
	// ErrAlreadyAttended is only used on the success-shaped response
	// (status: "already_attended"), never as an error body code.
	ErrAlreadyAttended ErrorCode = "ALREADY_ATTENDED"
	// ErrForbidden is only used by the HTTP layer for authenticated
	// non-student sessions; not a service-layer code.
	ErrForbidden ErrorCode = "FORBIDDEN"
)

// DBTX is the minimal transaction-capable database interface required by the
// attendance service. Both *pgxpool.Pool and pgx.Tx satisfy it.
type DBTX interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}

// TxRunner is the seam that starts the attendance transaction. Production
// uses pgx.BeginTxFunc; tests inject a fake transaction.
type TxRunner func(ctx context.Context, db DBTX, fn func(tx pgx.Tx) error) error

type Service struct {
	db        DBTX
	beginTx   TxRunner
	isDBAlive func(ctx context.Context) bool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{
		db:      db,
		beginTx: defaultTxRunner,
		isDBAlive: func(ctx context.Context) bool {
			if db == nil {
				return false
			}
			return db.Ping(ctx) == nil
		},
	}
}

func (s *Service) DB() DBTX { return s.db }

// isDatabaseAvailable reports whether the connection pool exists and is
// reachable. It is defensive: the handler also guards on IsAvailable before
// opening any query.
func (s *Service) isDatabaseAvailable(ctx context.Context) bool {
	if s.isDBAlive != nil {
		return s.isDBAlive(ctx)
	}
	return s.db != nil
}

// IsAvailable reports whether the service can serve attendance writes.
func (s *Service) IsAvailable(ctx context.Context) bool {
	return s != nil && s.db != nil && s.isDatabaseAvailable(ctx)
}

func defaultTxRunner(ctx context.Context, db DBTX, fn func(tx pgx.Tx) error) error {
	pool, ok := db.(*pgxpool.Pool)
	if !ok || pool == nil {
		return errors.New("attendance: database pool is not available")
	}
	return pgx.BeginTxFunc(ctx, pool, pgx.TxOptions{}, fn)
}

type ProcessInput struct {
	UserID              string
	AttendanceSessionID string
	IPAddress           *string
	UserAgent           *string
}

type ProcessResult struct {
	Status       string // "success", "already_attended", "error"
	AttendanceID string
	ProgramName  string
	CheckedInAt  time.Time
	ErrorCode    ErrorCode
}

type sessionRecord struct {
	ID                string
	ExpiresAt         time.Time
	SessionDate       time.Time
	ExtracurricularID string
	ProgramName       string
	IsActive          bool
}

// ProcessAttendance validates the student, attendance session, and enrollment
// inside a single transaction, then inserts the attendance record. Duplicate
// attendance (select race + unique violation 23505) is idempotent and becomes
// status "already_attended".
func (s *Service) ProcessAttendance(ctx context.Context, input ProcessInput) (*ProcessResult, error) {
	if s.db == nil {
		return &ProcessResult{Status: "error", ErrorCode: ErrDatabaseUnavailable}, nil
	}

	var result ProcessResult

	txErr := s.beginTx(ctx, s.db, func(tx pgx.Tx) error {
		// 1. Check student status (real schema: users).
		var studentID string
		err := tx.QueryRow(ctx, `
			SELECT id FROM users
			WHERE id = $1 AND role = 'STUDENT' AND status = 'APPROVED' AND is_active = TRUE
		`, input.UserID).Scan(&studentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrAccountDisabled
				return nil // commit cleanly; business error, not rollback-worthy
			}
			return err
		}

		// 2. Check session & extracurricular (real schema: attendance_sessions,
		// extracurriculars). AttendanceSession has no is_active column; that
		// belongs to extracurriculars.is_active.
		var session sessionRecord
		err = tx.QueryRow(ctx, `
			SELECT s.id, s.expires_at, s.session_date, e.id, e.name, e.is_active
			FROM attendance_sessions s
			JOIN extracurriculars e ON s.extracurricular_id = e.id
			WHERE s.id = $1
		`, input.AttendanceSessionID).Scan(
			&session.ID, &session.ExpiresAt, &session.SessionDate,
			&session.ExtracurricularID, &session.ProgramName, &session.IsActive,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrAttendanceClosed
				return nil
			}
			return err
		}

		if !session.IsActive || !session.ExpiresAt.After(time.Now()) {
			result.Status = "error"
			result.ErrorCode = ErrAttendanceClosed
			return nil
		}

		// 3. Check enrollment (real schema: enrollments).
		var enrollmentID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM enrollments
			WHERE user_id = $1 AND extracurricular_id = $2 AND status = 'APPROVED'
		`, input.UserID, session.ExtracurricularID).Scan(&enrollmentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrNotExtracurricularMember
				return nil
			}
			return err
		}

		// 4. Check existing attendance (idempotency). Unique constraint:
		// attendances(user_id, extracurricular_id, attendance_date).
		var existingID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM attendances
			WHERE user_id = $1 AND extracurricular_id = $2 AND attendance_date = $3
		`, input.UserID, session.ExtracurricularID, session.SessionDate).Scan(&existingID)
		if err == nil {
			result.Status = "already_attended"
			result.ProgramName = session.ProgramName
			return nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		// 5. Insert new attendance. The Prisma-managed `attendances` table has
		// no DB-level default for id (its UUIDs are generated client-side), so
		// it must be supplied explicitly: gen_random_uuid() (uuid, no ::text
		// cast). submitted_at/updated_at are NOT NULL and must be set because
		// raw SQL bypasses Prisma's @default/@updatedAt handling.
		now := time.Now()
		err = tx.QueryRow(ctx, `
			INSERT INTO attendances (
				id, user_id, extracurricular_id, attendance_date, status,
				attendance_method, attendance_session_id, checked_in_at,
				ip_address, user_agent, submitted_at, updated_at
			)
			VALUES (
				gen_random_uuid(), $1, $2, $3, 'PRESENT',
				'QR', $4, $5,
				$6, $7, now(), now()
			)
			RETURNING id
		`, input.UserID, session.ExtracurricularID, session.SessionDate,
			session.ID, now, input.IPAddress, input.UserAgent).Scan(&result.AttendanceID)
		if err != nil {
			// Unique violation 23505 between the select and insert (race):
			// treat as already attended instead of a DB failure.
			if isUniqueViolation(err) {
				result.Status = "already_attended"
				result.ProgramName = session.ProgramName
				return nil
			}
			return err
		}

		result.Status = "success"
		result.ProgramName = session.ProgramName
		result.CheckedInAt = now
		return nil
	})

	if txErr != nil {
		if isUniqueViolation(txErr) {
			// Defensive: the constraint error may surface as the tx error.
			result.Status = "already_attended"
			return &result, nil
		}
		// Never return raw DB errors to the HTTP layer: classify them here.
		result.Status = "error"
		result.ErrorCode = classifyDBError(txErr)
	}

	return &result, nil
}

// isUniqueViolation detects PostgreSQL unique_violation (SQLSTATE 23505).
func isUniqueViolation(err error) bool {
	type sqlStateProvider interface{ SQLState() string }
	var provider sqlStateProvider
	if errors.As(err, &provider) {
		return provider.SQLState() == "23505"
	}
	return false
}

// classifyDBError maps driver-level failures to the shared error contract.
// Context cancellation/deadline and an unavailable pool are service
// degradation (503); everything unexpected becomes INTERNAL_ERROR (500).
func classifyDBError(err error) ErrorCode {
	if err == nil {
		return ErrInternalError
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return ErrDatabaseUnavailable
	}
	if errors.Is(err, puddle.ErrClosedPool) {
		return ErrDatabaseUnavailable
	}
	return ErrInternalError
}
