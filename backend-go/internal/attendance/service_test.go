package attendance

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// contains reports whether haystack contains needle (case-insensitive helper
// for matching SQL fragments in the mock responder).
func contains(haystack, needle string) bool {
	return strings.Contains(haystack, needle)
}

// rowFunc adapts a scan callback to pgx.Row for the mock DBTX.
type rowFunc func(dest ...any) error

func (f rowFunc) Scan(dest ...any) error { return f(dest...) }

// fakeTx implements pgx.Tx just enough for ProcessAttendance. The response is
// chosen per call by the respond callback so each test can script the query
// sequence (user -> session -> enrollment -> existing -> insert).
type fakeTx struct {
	calls     int
	respond   func(call int, sql string, args []any) rowFunc
	commitErr error
}

func (t *fakeTx) Begin(ctx context.Context) (pgx.Tx, error)       { return t, nil }
func (t *fakeTx) BeginFunc(ctx context.Context, f func(pgx.Tx) error) error { return f(t) }
func (t *fakeTx) Commit(ctx context.Context) error                { return t.commitErr }
func (t *fakeTx) Rollback(ctx context.Context) error              { return nil }
func (t *fakeTx) CopyFrom(ctx context.Context, tn pgx.Identifier, columnNames []string, rowSrc pgx.CopyFromSource) (int64, error) {
	return 0, nil
}
func (t *fakeTx) SendBatch(ctx context.Context, b *pgx.Batch) pgx.BatchResults { return nil }
func (t *fakeTx) LargeObjects() pgx.LargeObjects                              { return pgx.LargeObjects{} }
func (t *fakeTx) Prepare(ctx context.Context, name, sql string) (*pgconn.StatementDescription, error) {
	return nil, nil
}
func (t *fakeTx) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}
func (t *fakeTx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return nil, nil
}
func (t *fakeTx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	t.calls++
	return t.respond(t.calls, sql, args)
}
func (t *fakeTx) Conn() *pgx.Conn { return nil }

// fakeDBTX implements the attendance DBTX interface (QueryRow + Begin).
type fakeDBTX struct {
	tx *fakeTx
}

func (d *fakeDBTX) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return d.tx.QueryRow(ctx, sql, args...)
}
func (d *fakeDBTX) Begin(ctx context.Context) (pgx.Tx, error) {
	return d.tx.Begin(ctx)
}

const userQuerySQL = `SELECT id FROM users`
const sessionQuerySQL = `SELECT s.id, s.expires_at, s.session_date, e.id, e.name, e.is_active`
const enrollmentQuerySQL = `SELECT id FROM enrollments`
const existingQuerySQL = `SELECT id FROM attendances`
const insertQuerySQL = `INSERT INTO attendances`

// newServiceWithTx builds a Service backed by the scripted fake transaction.
// beginTx bypasses pgx.BeginTxFunc and runs fn directly against the fake tx.
func newServiceWithTx(tx *fakeTx) *Service {
	return &Service{
		db: &fakeDBTX{tx: tx},
		beginTx: func(ctx context.Context, db DBTX, fn func(tx pgx.Tx) error) error {
			return fn(tx)
		},
		isDBAlive: func(ctx context.Context) bool { return true },
	}
}

func TestProcessAttendance_NilDBReturnsDatabaseUnavailable(t *testing.T) {
	s := &Service{db: nil, beginTx: defaultTxRunner}
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "u1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res == nil || res.ErrorCode != ErrDatabaseUnavailable {
		t.Errorf("expected DATABASE_UNAVAILABLE, got %+v", res)
	}
}

func TestProcessAttendance_Success(t *testing.T) {
	tx := &fakeTx{}
	tx.respond = func(call int, sql string, args []any) rowFunc {
		switch {
		case contains(sql, userQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		case contains(sql, sessionQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(1 * time.Hour)
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		case contains(sql, enrollmentQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "enrollment-1"
				return nil
			}
		case contains(sql, existingQuerySQL):
			return func(dest ...any) error { return pgx.ErrNoRows }
		case contains(sql, insertQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "attendance-1"
				return nil
			}
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}

	s := newServiceWithTx(tx)
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{
		UserID:              "student-1",
		AttendanceSessionID: "session-1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.Status != "success" {
		t.Errorf("expected status success, got %s", res.Status)
	}
	if res.ProgramName != "Pramuka" {
		t.Errorf("expected ProgramName Pramuka, got %s", res.ProgramName)
	}
	if res.CheckedInAt.IsZero() {
		t.Errorf("expected non-zero CheckedInAt")
	}
	if res.AttendanceID != "attendance-1" {
		t.Errorf("expected AttendanceID attendance-1, got %q", res.AttendanceID)
	}
}

func TestProcessAttendance_StudentInactive(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		if contains(sql, userQuerySQL) {
			return func(dest ...any) error { return pgx.ErrNoRows }
		}
		return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
	}}
	s := newServiceWithTx(tx)
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.Status != "error" || res.ErrorCode != ErrAccountDisabled {
		t.Errorf("expected error ACCOUNT_DISABLED, got %+v", res)
	}
}

func TestProcessAttendance_SessionNotFound(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		if contains(sql, userQuerySQL) {
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		}
		if contains(sql, sessionQuerySQL) {
			return func(dest ...any) error { return pgx.ErrNoRows }
		}
		return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
	}}
	s := newServiceWithTx(tx)
	res, _ := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "missing"})
	if res.ErrorCode != ErrAttendanceClosed {
		t.Errorf("expected ATTENDANCE_CLOSED, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_SessionExpired(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		if contains(sql, userQuerySQL) {
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		}
		if contains(sql, sessionQuerySQL) {
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(-1 * time.Hour) // expired
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		}
		return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
	}}
	s := newServiceWithTx(tx)
	res, _ := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "session-1"})
	if res.ErrorCode != ErrAttendanceClosed {
		t.Errorf("expected ATTENDANCE_CLOSED for expired session, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_ExtracurricularInactive(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		if contains(sql, userQuerySQL) {
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		}
		if contains(sql, sessionQuerySQL) {
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(1 * time.Hour)
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = false // extracurricular inactive
				return nil
			}
		}
		return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
	}}
	s := newServiceWithTx(tx)
	res, _ := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "session-1"})
	if res.ErrorCode != ErrAttendanceClosed {
		t.Errorf("expected ATTENDANCE_CLOSED for inactive extracurricular, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_NotEnrolledMember(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		switch {
		case contains(sql, userQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		case contains(sql, sessionQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(1 * time.Hour)
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		case contains(sql, enrollmentQuerySQL):
			return func(dest ...any) error { return pgx.ErrNoRows }
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}}
	s := newServiceWithTx(tx)
	res, _ := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "session-1"})
	if res.ErrorCode != ErrNotExtracurricularMember {
		t.Errorf("expected NOT_EXTRACURRICULAR_MEMBER, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_AlreadyAttended(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		switch {
		case contains(sql, userQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		case contains(sql, sessionQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(1 * time.Hour)
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		case contains(sql, enrollmentQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "enrollment-1"
				return nil
			}
		case contains(sql, existingQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "existing-1" // already exists
				return nil
			}
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}}
	s := newServiceWithTx(tx)
	res, _ := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "session-1"})
	if res.Status != "already_attended" {
		t.Errorf("expected already_attended, got %s", res.Status)
	}
	if res.ProgramName != "Pramuka" {
		t.Errorf("expected ProgramName populated, got %q", res.ProgramName)
	}
}

// pgError implements the SQLState() provider interface for unique-violation
// simulation (matches pgconn.PgError's shape used by isUniqueViolation).
type pgError struct{ code string }

func (e *pgError) Error() string    { return "fake pg error" }
func (e *pgError) SQLState() string { return e.code }

func TestProcessAttendance_UniqueViolationRace(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		switch {
		case contains(sql, userQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "student-1"
				return nil
			}
		case contains(sql, sessionQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "session-1"
				*(dest[1].(*time.Time)) = time.Now().Add(1 * time.Hour)
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = "extracurricular-1"
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		case contains(sql, enrollmentQuerySQL):
			return func(dest ...any) error {
				*(dest[0].(*string)) = "enrollment-1"
				return nil
			}
		case contains(sql, existingQuerySQL):
			return func(dest ...any) error { return pgx.ErrNoRows }
		case contains(sql, insertQuerySQL):
			// Insert fails with unique violation (23505) → already_attended.
			return func(dest ...any) error { return &pgError{code: "23505"} }
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}}
	s := newServiceWithTx(tx)
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1", AttendanceSessionID: "session-1"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if res.Status != "already_attended" {
		t.Errorf("expected already_attended on unique violation, got %s", res.Status)
	}
	if res.ProgramName != "Pramuka" {
		t.Errorf("expected ProgramName populated, got %q", res.ProgramName)
	}
}

func TestProcessAttendance_UnexpectedDBFailure_MapsToInternalError(t *testing.T) {
	tx := &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
		if contains(sql, userQuerySQL) {
			return func(dest ...any) error { return errors.New("connection broken") }
		}
		return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
	}}
	s := newServiceWithTx(tx)
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1"})
	if err != nil {
		t.Fatalf("expected no error (mapped to error result), got %v", err)
	}
	if res.Status != "error" {
		t.Errorf("expected status error, got %s", res.Status)
	}
	if res.ErrorCode != ErrInternalError {
		t.Errorf("expected INTERNAL_ERROR, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_TransactionStartedFailure_DatabaseUnavailable(t *testing.T) {
	// Simulates beginTx failing before any query runs (e.g. context canceled).
	s := &Service{
		db: &fakeDBTX{tx: &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
			return func(dest ...any) error { return nil }
		}}},
		beginTx: func(ctx context.Context, db DBTX, fn func(tx pgx.Tx) error) error {
			return context.Canceled
		},
		isDBAlive: func(ctx context.Context) bool { return true },
	}
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1"})
	if err != nil {
		t.Fatalf("expected no error (classified), got %v", err)
	}
	if res.ErrorCode != ErrDatabaseUnavailable {
		t.Errorf("expected DATABASE_UNAVAILABLE on canceled context, got %s", res.ErrorCode)
	}
}

func TestProcessAttendance_UniqueViolationAtTxLevel(t *testing.T) {
	// Defensive path: the 23505 surfaces as the transaction error itself.
	s := &Service{
		db: &fakeDBTX{tx: &fakeTx{respond: func(call int, sql string, args []any) rowFunc {
			return func(dest ...any) error { return nil }
		}}},
		beginTx: func(ctx context.Context, db DBTX, fn func(tx pgx.Tx) error) error {
			return &pgError{code: "23505"}
		},
		isDBAlive: func(ctx context.Context) bool { return true },
	}
	res, err := s.ProcessAttendance(context.Background(), ProcessInput{UserID: "student-1"})
	if err != nil {
		t.Fatalf("expected no error (mapped), got %v", err)
	}
	if res.Status != "already_attended" {
		t.Errorf("expected already_attended, got %s", res.Status)
	}
}

func TestClassifyDBError(t *testing.T) {
	if classifyDBError(context.Canceled) != ErrDatabaseUnavailable {
		t.Errorf("expected DATABASE_UNAVAILABLE for canceled context")
	}
	if classifyDBError(context.DeadlineExceeded) != ErrDatabaseUnavailable {
		t.Errorf("expected DATABASE_UNAVAILABLE for deadline exceeded")
	}
	if classifyDBError(errors.New("boom")) != ErrInternalError {
		t.Errorf("expected INTERNAL_ERROR for unknown error")
	}
	if classifyDBError(nil) != ErrInternalError {
		t.Errorf("expected INTERNAL_ERROR for nil")
	}
}

func TestIsUniqueViolation(t *testing.T) {
	if !isUniqueViolation(&pgError{code: "23505"}) {
		t.Errorf("expected true for 23505")
	}
	if isUniqueViolation(&pgError{code: "23503"}) {
		t.Errorf("expected false for foreign-key violation")
	}
	if isUniqueViolation(errors.New("other")) {
		t.Errorf("expected false for non-SQLSTATE error")
	}
	if isUniqueViolation(fmt.Errorf("wrapped: %w", &pgError{code: "23505"})) != true {
		t.Errorf("expected true for wrapped 23505")
	}
}

// TestIsAvailable verifies the nil-guard used by the handler.
func TestIsAvailable(t *testing.T) {
	var nilSvc *Service
	if nilSvc.IsAvailable(context.Background()) {
		t.Errorf("expected false for nil service")
	}

	s := &Service{db: nil}
	if s.IsAvailable(context.Background()) {
		t.Errorf("expected false for nil db")
	}

	s2 := &Service{
		db:        &fakeDBTX{tx: &fakeTx{}},
		isDBAlive: func(ctx context.Context) bool { return true },
	}
	if !s2.IsAvailable(context.Background()) {
		t.Errorf("expected true for healthy db")
	}

	s3 := &Service{
		db:        &fakeDBTX{tx: &fakeTx{}},
		isDBAlive: func(ctx context.Context) bool { return false },
	}
	if s3.IsAvailable(context.Background()) {
		t.Errorf("expected false when isDBAlive reports false")
	}
}
