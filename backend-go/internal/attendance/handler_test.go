package attendance

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/namsel/exisel/backend-go/internal/auth"
	"github.com/namsel/exisel/backend-go/internal/middleware"
)

const testSecret = "test-secret-key-for-hmac-min-32!!"

// handlerDBTX is a minimal DBTX whose QueryRow is scripted directly (used for
// the handler's own session lookup); Begin is not used because tests inject a
// beginTx seam.
type handlerDBTX struct {
	row func(sql string, args ...any) pgx.Row
}

func (d *handlerDBTX) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return d.row(sql, args...)
}
func (d *handlerDBTX) Begin(ctx context.Context) (pgx.Tx, error) {
	return nil, fmt.Errorf("handlerDBTX.Begin: not used in tests")
}

// scanRequestContext builds a request with the given body JSON, Origin header
// (must match the QR token origin for validation), and an authenticated
// student session in context (nil skips auth context). Wrapped with the
// RequestID middleware so X-Request-ID flows into WriteError.
func scanRequestContext(t *testing.T, handler http.HandlerFunc, body string, session *auth.Session, qrToken string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/core/v1/attendance/scan", strings.NewReader(body))
	req.Header.Set("Origin", "http://exisel.test")
	if session != nil {
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, session)
		req = req.WithContext(ctx)
	}
	rec := httptest.NewRecorder()
	middleware.RequestID(handler).ServeHTTP(rec, req)
	return rec
}

func approvedStudentSession() *auth.Session {
	return &auth.Session{
		ID:       "sess-1",
		UserID:   "student-1",
		Role:     "STUDENT",
		Status:   "APPROVED",
		IsActive: true,
	}
}

// buildQRToken signs a rotating attendance QR payload the same way the Next.js
// layer does (rotating-qr.ts): message "1.{eid}.{dateKey}.{bucket}.{nonce}"
// with HMAC-SHA256(SECRET), base64url without padding.
func buildQRToken(t *testing.T, eid, dateKey, nonce string, bucket int64) string {
	t.Helper()
	msg := fmt.Sprintf("1.%s.%s.%d.%s", eid, dateKey, bucket, nonce)
	mac := hmac.New(sha256.New, []byte(testSecret))
	_, _ = mac.Write([]byte(msg))
	sig := strings.TrimRight(base64.URLEncoding.EncodeToString(mac.Sum(nil)), "=")

	q := url.Values{}
	q.Set("v", "1")
	q.Set("e", eid)
	q.Set("d", dateKey)
	q.Set("t", strconv.FormatInt(bucket, 10))
	q.Set("s", sig)
	return "http://exisel.test/attendance/scan?" + q.Encode()
}

func currentBucket() int64 {
	return time.Now().UnixMilli() / 25000
}

func setSecret(t *testing.T) {
	t.Helper()
	t.Setenv("SESSION_SECRET", testSecret)
}

func sessionLookupRow(sessionID, code string, sessionDate time.Time, lookupErr error) rowFunc {
	return func(dest ...any) error {
		if lookupErr != nil {
			return lookupErr
		}
		*(dest[0].(*string)) = sessionID
		*(dest[1].(*string)) = code
		*(dest[2].(*time.Time)) = sessionDate
		return nil
	}
}

func TestHandleScan_NilDB_Returns503DatabaseUnavailable(t *testing.T) {
	setSecret(t)
	h := NewHandlerWithService(&Service{db: nil, beginTx: defaultTxRunner}, nil)

	rec := scanRequestContext(t, h.HandleScan, `{"token":"x"}`, approvedStudentSession(), "")

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
	var body ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body.Error != string(ErrDatabaseUnavailable) {
		t.Errorf("expected DATABASE_UNAVAILABLE, got %q", body.Error)
	}
	if body.Message != "Sistem kehadiran sedang bermasalah." {
		t.Errorf("expected safe message, got %q", body.Message)
	}
	if rec.Header().Get("X-Request-ID") == "" {
		t.Errorf("expected X-Request-ID header")
	}
}

func TestHandleScan_NoSessionContext_Returns401Unauthenticated(t *testing.T) {
	setSecret(t)
	h := NewHandlerWithService(&Service{
		db:        &handlerDBTX{row: func(string, ...any) pgx.Row { return nil }},
		beginTx:   defaultTxRunner,
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	rec := scanRequestContext(t, h.HandleScan, `{"token":"x"}`, nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	var body ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != string(ErrUnauthenticated) {
		t.Errorf("expected UNAUTHENTICATED, got %q", body.Error)
	}
}

func TestHandleScan_AdminSession_Returns403Forbidden(t *testing.T) {
	setSecret(t)
	h := NewHandlerWithService(&Service{
		db:        &handlerDBTX{row: func(string, ...any) pgx.Row { return nil }},
		beginTx:   defaultTxRunner,
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	admin := &auth.Session{ID: "s", UserID: "u", Role: "ADMIN", Status: "APPROVED", IsActive: true}
	rec := scanRequestContext(t, h.HandleScan, `{"token":"x"}`, admin, "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
	var body ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != string(ErrForbidden) {
		t.Errorf("expected FORBIDDEN, got %q", body.Error)
	}
}

func TestHandleScan_PendingStudent_Returns403AccountDisabled(t *testing.T) {
	setSecret(t)
	h := NewHandlerWithService(&Service{
		db:        &handlerDBTX{row: func(string, ...any) pgx.Row { return nil }},
		beginTx:   defaultTxRunner,
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	pending := &auth.Session{ID: "s", UserID: "u", Role: "STUDENT", Status: "PENDING", IsActive: true}
	rec := scanRequestContext(t, h.HandleScan, `{"token":"x"}`, pending, "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
	var body ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != string(ErrAccountDisabled) {
		t.Errorf("expected ACCOUNT_DISABLED, got %q", body.Error)
	}
}

func TestHandleScan_InvalidBody_Returns400QRInvalid(t *testing.T) {
	setSecret(t)
	h := NewHandlerWithService(&Service{
		db:        &handlerDBTX{row: func(string, ...any) pgx.Row { return nil }},
		beginTx:   defaultTxRunner,
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	for _, bad := range []string{"", "{not-json", `{"token":""}`} {
		rec := scanRequestContext(t, h.HandleScan, bad, approvedStudentSession(), "")
		if rec.Code != http.StatusBadRequest {
			t.Errorf("body %q: expected 400, got %d", bad, rec.Code)
		}
	}
}

func TestHandleScan_SessionLookupNoRows_Returns410AttendanceClosed(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		// Scripted lookup: no attendance session exists for this e/d.
		return rowFunc(func(dest ...any) error { return pgx.ErrNoRows })
	}}

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrAttendanceClosed) {
		t.Errorf("expected ATTENDANCE_CLOSED, got %q", resp.Error)
	}
}

func TestHandleScan_SessionLookupMalformedDate_Returns400(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "bogus"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return rowFunc(func(dest ...any) error {
			return &pgconn.PgError{Code: "22007", Message: "invalid input syntax for type date"}
		})
	}}
	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrQRInvalid) {
		t.Errorf("expected QR_INVALID, got %q", resp.Error)
	}
}

func TestHandleScan_SessionLookupInternalError_Returns500WithRequestId(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return rowFunc(func(dest ...any) error { return fmt.Errorf("connection refused") })
	}}
	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrInternalError) {
		t.Errorf("expected INTERNAL_ERROR, got %q", resp.Error)
	}
	if resp.RequestID == "" {
		t.Errorf("expected requestId in body for unexpected 5xx")
	}
	if rec.Header().Get("X-Request-ID") == "" {
		t.Errorf("expected X-Request-ID header")
	}
}

func TestHandleScan_QRMissingTandS_Returns410QRInvalid(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}
	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	q := url.Values{}
	q.Set("v", "1")
	q.Set("e", eid)
	q.Set("d", dateKey)
	// Deliberately omit t and s.
	token := "http://exisel.test/attendance/scan?" + q.Encode()
	body := fmt.Sprintf(`{"token":%q}`, token)

	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrQRInvalid) {
		t.Errorf("expected QR_INVALID (tampered/missing t,s), got %q", resp.Error)
	}
}

func TestHandleScan_ExpiredQRBucket_Returns410QRExpired(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}
	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	// Bucket two rotations in the past → outside the current/previous window.
	token := buildQRToken(t, eid, dateKey, nonce, currentBucket()-2)
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrQRExpired) {
		t.Errorf("expected QR_EXPIRED, got %q", resp.Error)
	}
}

// TestHandleScan_ValidQR_Success drives a full happy path: nil-guard passes,
// session in context, DB lookup finds nonce, QR signature verifies, and the
// scripted transaction inserts the attendance row.
func TestHandleScan_ValidQR_Success(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}

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
				*(dest[3].(*string)) = eid
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
	}}

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(ctx context.Context, _ DBTX, fn func(pgx.Tx) error) error { return fn(tx) },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d\nbody: %s", rec.Code, rec.Body.String())
	}
	var resp SuccessResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "success" {
		t.Errorf("expected status success, got %q", resp.Status)
	}
	if resp.ProgramName != "Pramuka" {
		t.Errorf("expected ProgramName Pramuka, got %q", resp.ProgramName)
	}
	if rec.Header().Get("X-Request-ID") == "" {
		t.Errorf("expected X-Request-ID header on success")
	}
}

// TestHandleScan_ValidQR_AlreadyAttended verifies idempotent duplicate scans:
// the unique-violation race is surfaced as success shape already_attended.
func TestHandleScan_ValidQR_AlreadyAttended(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}

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
				*(dest[3].(*string)) = eid
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
				*(dest[0].(*string)) = "existing-1"
				return nil
			}
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}}

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(ctx context.Context, _ DBTX, fn func(pgx.Tx) error) error { return fn(tx) },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp SuccessResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Status != "already_attended" {
		t.Errorf("expected already_attended, got %q", resp.Status)
	}
	if resp.ProgramName != "Pramuka" {
		t.Errorf("expected ProgramName Pramuka, got %q", resp.ProgramName)
	}
}

// TestHandleScan_ValidQR_NotEnrolledMember verifies the 403 mapping for a
// student whose enrollment is not APPROVED.
func TestHandleScan_ValidQR_NotEnrolledMember(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}

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
				*(dest[3].(*string)) = eid
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

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(ctx context.Context, _ DBTX, fn func(pgx.Tx) error) error { return fn(tx) },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrNotExtracurricularMember) {
		t.Errorf("expected NOT_EXTRACURRICULAR_MEMBER, got %q", resp.Error)
	}
	if resp.RequestID != "" {
		t.Errorf("expected no requestId in body for 4xx, got %q", resp.RequestID)
	}
}

// TestHandleScan_ValidQR_SessionExpired verifies the ATTENDANCE_CLOSED mapping
// when the session's expires_at has passed.
func TestHandleScan_ValidQR_SessionExpired(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}

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
				*(dest[1].(*time.Time)) = time.Now().Add(-1 * time.Hour) // expired
				*(dest[2].(*time.Time)) = time.Now()
				*(dest[3].(*string)) = eid
				*(dest[4].(*string)) = "Pramuka"
				*(dest[5].(*bool)) = true
				return nil
			}
		default:
			return func(dest ...any) error { return fmt.Errorf("unexpected sql: %s", sql) }
		}
	}}

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(ctx context.Context, _ DBTX, fn func(pgx.Tx) error) error { return fn(tx) },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	token := buildQRToken(t, eid, dateKey, nonce, currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrAttendanceClosed) {
		t.Errorf("expected ATTENDANCE_CLOSED, got %q", resp.Error)
	}
}

// TestHandleScan_TamperedSignature ensures an invalid HMAC signature is
// rejected with QR_EXPIRED (rotated QR) and never reaches the service.
func TestHandleScan_TamperedSignature(t *testing.T) {
	setSecret(t)
	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}
	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(context.Context, DBTX, func(pgx.Tx) error) error { return nil },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	// Build a token signed with a DIFFERENT nonce so the sig does not match.
	token := buildQRToken(t, eid, dateKey, "wrong-nonce-00", currentBucket())
	body := fmt.Sprintf(`{"token":%q}`, token)
	rec := scanRequestContext(t, h.HandleScan, body, approvedStudentSession(), token)
	if rec.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rec.Code)
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Error != string(ErrQRExpired) {
		t.Errorf("expected QR_EXPIRED for tampered signature, got %q", resp.Error)
	}
}

// TestHandleScan_NoOrigin_UsesCanonicalAppOrigin ensures QR validation still
// succeeds when the request arrives without an Origin header (e.g. direct
// core traffic) by tolerating NEXT_PUBLIC_APP_URL as a trusted origin — the
// same anchor the Next.js QR builder uses.
func TestHandleScan_NoOrigin_UsesCanonicalAppOrigin(t *testing.T) {
	setSecret(t)
	t.Setenv("NEXT_PUBLIC_APP_URL", "https://exisel.web.id")

	eid, dateKey := "extracurricular-1", "2026-08-17"
	nonce := "abcdef123456"

	db := &handlerDBTX{row: func(sql string, args ...any) pgx.Row {
		return sessionLookupRow("session-1", nonce, time.Now(), nil)
	}}

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
				*(dest[3].(*string)) = eid
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
	}}

	h := NewHandlerWithService(&Service{
		db:        db,
		beginTx:   func(ctx context.Context, _ DBTX, fn func(pgx.Tx) error) error { return fn(tx) },
		isDBAlive: func(context.Context) bool { return true },
	}, nil)

	// Token is signed with the canonical app origin; no browser Origin header
	// is present in the request.
	bucket := currentBucket()
	msg := fmt.Sprintf("1.%s.%s.%d.%s", eid, dateKey, bucket, nonce)
	mac := hmac.New(sha256.New, []byte(testSecret))
	_, _ = mac.Write([]byte(msg))
	sig := strings.TrimRight(base64.URLEncoding.EncodeToString(mac.Sum(nil)), "=")
	q := url.Values{}
	q.Set("v", "1")
	q.Set("e", eid)
	q.Set("d", dateKey)
	q.Set("t", strconv.FormatInt(bucket, 10))
	q.Set("s", sig)
	token := "https://exisel.web.id/attendance/scan?" + q.Encode()

	body := fmt.Sprintf(`{"token":%q}`, token)
	req := httptest.NewRequest(http.MethodPost, "/api/core/v1/attendance/scan", strings.NewReader(body))
	// Deliberately NO Origin header.
	reqCtx := context.WithValue(req.Context(), middleware.UserContextKey, approvedStudentSession())
	req = req.WithContext(reqCtx)
	rec := httptest.NewRecorder()
	middleware.RequestID(http.HandlerFunc(h.HandleScan)).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 via canonical origin tolerance, got %d\nbody: %s", rec.Code, rec.Body.String())
	}
	var resp SuccessResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Status != "success" {
		t.Errorf("expected success, got %q", resp.Status)
	}
}

// TestClientRemoteAddr verifies the ip_address truncation helper.
func TestClientRemoteAddr(t *testing.T) {
	req := httptest.NewRequest("POST", "/", nil)
	req.RemoteAddr = "203.0.113.7:54321"
	if got := clientRemoteAddr(req); got != "203.0.113.7" {
		t.Errorf("expected 203.0.113.7, got %q", got)
	}

	req.RemoteAddr = strings.Repeat("f", 100) + ":1234"
	if got := clientRemoteAddr(req); len(got) > 45 {
		t.Errorf("expected truncation to 45 chars, got len %d", len(got))
	}
}
