package attendance

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ErrorCode string

const (
	ErrAccountDisabled         ErrorCode = "ACCOUNT_DISABLED"
	ErrAttendanceClosed        ErrorCode = "ATTENDANCE_CLOSED"
	ErrNotExtracurricularMember ErrorCode = "NOT_EXTRACURRICULAR_MEMBER"
	ErrAlreadyAttended         ErrorCode = "ALREADY_ATTENDED"
	ErrInternalError           ErrorCode = "INTERNAL_ERROR"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

type ProcessInput struct {
	UserID              string
	AttendanceSessionID string
	IPAddress           *string
	UserAgent           *string
}

type ProcessResult struct {
	Status        string // "success", "already_attended", "error"
	AttendanceID  string
	ProgramName   string
	CheckedInAt   time.Time
	ErrorCode     ErrorCode
}

func (s *Service) ProcessAttendance(ctx context.Context, input ProcessInput) (*ProcessResult, error) {
	var result ProcessResult

	err := pgx.BeginTxFunc(ctx, s.db, pgx.TxOptions{}, func(tx pgx.Tx) error {
		// 1. Check student status
		var studentID string
		err := tx.QueryRow(ctx, `
			SELECT id FROM "User" 
			WHERE id = $1 AND role = 'STUDENT' AND status = 'APPROVED' AND "isActive" = true
		`, input.UserID).Scan(&studentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrAccountDisabled
				return nil // Return nil to avoid rollback, just exit tx cleanly with business error
			}
			return err
		}

		// 2. Check session & extracurricular
		var session struct {
			ID                string
			ExpiresAt         time.Time
			SessionDate       time.Time
			ExtracurricularID string
			ProgramName       string
			IsActive          bool
		}
		
		err = tx.QueryRow(ctx, `
			SELECT s.id, s."expiresAt", s."sessionDate", e.id, e.name, e."isActive"
			FROM "AttendanceSession" s
			JOIN "Extracurricular" e ON s."extracurricularId" = e.id
			WHERE s.id = $1
		`, input.AttendanceSessionID).Scan(&session.ID, &session.ExpiresAt, &session.SessionDate, &session.ExtracurricularID, &session.ProgramName, &session.IsActive)
		
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrAttendanceClosed
				return nil
			}
			return err
		}

		if !session.IsActive || session.ExpiresAt.Before(time.Now()) {
			result.Status = "error"
			result.ErrorCode = ErrAttendanceClosed
			return nil
		}

		// 3. Check enrollment
		var enrollmentID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM "Enrollment"
			WHERE "userId" = $1 AND "extracurricularId" = $2 AND status = 'APPROVED'
		`, input.UserID, session.ExtracurricularID).Scan(&enrollmentID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				result.Status = "error"
				result.ErrorCode = ErrNotExtracurricularMember
				return nil
			}
			return err
		}

		// 4. Check existing attendance (Idempotency)
		var existingID string
		err = tx.QueryRow(ctx, `
			SELECT id FROM "Attendance"
			WHERE "userId" = $1 AND "extracurricularId" = $2 AND "attendanceDate" = $3
		`, input.UserID, session.ExtracurricularID, session.SessionDate).Scan(&existingID)
		if err == nil {
			result.Status = "already_attended"
			result.ProgramName = session.ProgramName
			return nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		// 5. Insert new attendance
		now := time.Now()
		err = tx.QueryRow(ctx, `
			INSERT INTO "Attendance" 
			("id", "userId", "extracurricularId", "attendanceDate", "status", "attendanceMethod", "attendanceSessionId", "checkedInAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
			VALUES (gen_random_uuid()::text, $1, $2, $3, 'PRESENT', 'QR', $4, $5, $6, $7, $5, $5)
			RETURNING id
		`, input.UserID, session.ExtracurricularID, session.SessionDate, session.ID, now, input.IPAddress, input.UserAgent).Scan(&result.AttendanceID)
		
		if err != nil {
			// Handle unique constraint violation just in case of race condition between select and insert
			// PostgreSQL unique violation error code is 23505
			if pgErr, ok := err.(interface{ SQLState() string }); ok && pgErr.SQLState() == "23505" {
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

	if err != nil {
		// ponytail: skipped detailed DB error logging, add when adding standard structured logger
		result.Status = "error"
		result.ErrorCode = ErrInternalError
		return &result, nil
	}

	return &result, nil
}