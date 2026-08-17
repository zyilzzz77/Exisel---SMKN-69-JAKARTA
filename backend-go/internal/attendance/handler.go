package attendance

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/namsel/exisel/backend-go/internal/auth"
	"github.com/namsel/exisel/backend-go/internal/middleware"
	"github.com/namsel/exisel/backend-go/internal/qr"
)

type Handler struct {
	service *Service
	logger  *slog.Logger
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return NewHandlerWithService(NewService(db), nil)
}

// NewHandlerWithService builds the scan handler around an existing service
// (used to inject test doubles) and logger (nil falls back to slog.Default()).
func NewHandlerWithService(service *Service, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{service: service, logger: logger}
}

type ScanRequest struct {
	Token string `json:"token"`
}

type ErrorResponse struct {
	Message   string `json:"message"`
	Error     string `json:"error"`
	RequestID string `json:"requestId,omitempty"`
}

type SuccessResponse struct {
	Message           string `json:"message"`
	Status            string `json:"status"`
	ExtracurricularID string `json:"extracurricularId"`
	ProgramName       string `json:"programName"`
	CheckedInAt       string `json:"checkedInAt,omitempty"`
}

// WriteError emits the shared attendance error contract: HTTP status +
// {message, error} body. The X-Request-ID response header is always set so
// every rejection is traceable; the requestId body field is only included for
// unexpected 5xx responses (reference code, plan §5/§6).
func WriteError(w http.ResponseWriter, r *http.Request, status int, code ErrorCode, message string) {
	reqID := middleware.GetRequestID(r.Context())

	w.Header().Set("X-Request-ID", reqID)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	body := ErrorResponse{Message: message, Error: string(code)}
	if status >= http.StatusInternalServerError {
		body.RequestID = reqID
	}

	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// sessionUserFromContext returns the authenticated session set by
// middleware.RequireAuth.
func sessionUserFromContext(r *http.Request) *auth.Session {
	if session, ok := r.Context().Value(middleware.UserContextKey).(*auth.Session); ok {
		return session
	}
	return nil
}

func (h *Handler) HandleScan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	// 0. Nil-guard the database pool first. If the API started in degraded
	// state (DB connect failed at boot), any query would nil-panic; answer
	// 503 deterministically instead.
	if !h.service.IsAvailable(r.Context()) {
		WriteError(w, r, http.StatusServiceUnavailable, ErrDatabaseUnavailable,
			"Sistem kehadiran sedang bermasalah.")
		return
	}

	// 1. Authenticate: RequireAuth must have placed the session in context.
	session := sessionUserFromContext(r)
	if session == nil {
		WriteError(w, r, http.StatusUnauthorized, ErrUnauthenticated,
			"Silakan login untuk melanjutkan absensi.")
		return
	}

	// 2. Authorize: only active, approved students may scan attendance.
	if !session.IsApprovedStudent() {
		if session.Role != "STUDENT" {
			WriteError(w, r, http.StatusForbidden, ErrForbidden,
				"Hanya siswa yang dapat melakukan absensi.")
			return
		}
		WriteError(w, r, http.StatusForbidden, ErrAccountDisabled,
			"Akun siswa tidak aktif atau belum disetujui.")
		return
	}

	// 3. Decode request.
	// Note: per-route rate limiting on the Go core is not wired yet (existing
	// gap); the Next.js scan route applies its own rate limiter before
	// proxying, which is the authoritative guard today.
	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		WriteError(w, r, http.StatusBadRequest, ErrQRInvalid, "QR kehadiran tidak valid.")
		return
	}
	req.Token = strings.TrimSpace(req.Token)
	if len(req.Token) > 512 {
		WriteError(w, r, http.StatusBadRequest, ErrQRInvalid, "QR kehadiran tidak valid.")
		return
	}

	// 4. Structural parse to get e/d before any DB lookup.
	tokenURL, err := url.Parse(req.Token)
	if err != nil {
		WriteError(w, r, http.StatusBadRequest, ErrQRInvalid, "QR kehadiran tidak valid.")
		return
	}
	query := tokenURL.Query()
	extracurricularID := query.Get("e")
	dateKey := query.Get("d")
	hasBucket := query.Get("t") != ""
	hasSignature := query.Get("s") != ""

	// 5. Fetch the rotating session nonce from the real schema (snake_case).
	var sessionID string
	var sessionCode string
	var sessionDate time.Time
	err = h.service.DB().QueryRow(r.Context(), `
		SELECT id, code, session_date FROM attendance_sessions
		WHERE extracurricular_id = $1 AND session_date = $2::date
	`, extracurricularID, dateKey).Scan(&sessionID, &sessionCode, &sessionDate)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			WriteError(w, r, http.StatusGone, ErrAttendanceClosed,
				"Sesi absensi sudah ditutup atau belum aktif.")
			return
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && strings.HasPrefix(pgErr.Code, "22") {
			// Data-exception class: malformed e/d params from a crafted or
			// corrupted token — client error, not 5xx.
			WriteError(w, r, http.StatusBadRequest, ErrQRInvalid, "QR kehadiran tidak valid.")
			return
		}
		h.logger.Error("attendance scan session lookup failed",
			slog.String("requestId", middleware.GetRequestID(r.Context())),
			slog.String("error", err.Error()))
		WriteError(w, r, http.StatusInternalServerError, ErrInternalError,
			"Sistem kehadiran sedang bermasalah.")
		return
	}

	// 6. Validate QR cryptographically (semantics unchanged; see validator).
	host := r.Host
	if host == "" {
		host = "localhost:8080"
	}
	origin := r.Header.Get("Origin")
	allowedOrigins := make([]string, 0, 2)
	if origin != "" {
		allowedOrigins = append(allowedOrigins, origin)
	}
	// The Next.js proxy forwards the browser Origin, but direct core traffic
	// (or a proxy that drops it) still needs the canonical app origin to
	// validate real QR payloads — same trust anchor Next's qrScanOrigin uses
	// (NEXT_PUBLIC_APP_URL). This never weakens validation: it only allows
	// the configured canonical origin in addition to the forwarded origin.
	if appOrigin := configuredAppOrigin(); appOrigin != "" && appOrigin != origin {
		allowedOrigins = append(allowedOrigins, appOrigin)
	}

	isValid := qr.ValidateAttendanceQRPayload(req.Token, qr.ValidateInput{
		ExtracurricularID: extracurricularID,
		DateKey:           dateKey,
		SessionNonce:      sessionCode,
		Now:               time.Now().UnixMilli(),
		AllowedOrigins:    allowedOrigins,
		Host:              host,
	})
	if !isValid {
		code := ErrQRExpired
		msg := "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru."
		if !hasBucket || !hasSignature {
			code = ErrQRInvalid
			msg = "QR kehadiran tidak valid."
		}
		WriteError(w, r, http.StatusGone, code, msg)
		return
	}

	// 7. Process attendance (transactional; idempotent). Never pass raw DB
	// errors to the client; the service maps them to the shared contract.
	remoteIP := clientRemoteAddr(r)
	userAgent := r.UserAgent()

	result, err := h.service.ProcessAttendance(r.Context(), ProcessInput{
		UserID:              session.UserID,
		AttendanceSessionID: sessionID,
		IPAddress:           &remoteIP,
		UserAgent:           &userAgent,
	})
	if err != nil || result == nil {
		h.logger.Error("attendance scan failed unexpectedly",
			slog.String("requestId", middleware.GetRequestID(r.Context())))
		WriteError(w, r, http.StatusInternalServerError, ErrInternalError,
			"Kehadiran belum dapat disimpan. Coba lagi.")
		return
	}

	switch result.Status {
	case "success":
		w.Header().Set("X-Request-ID", middleware.GetRequestID(r.Context()))
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(SuccessResponse{
			Message:           "Kehadiran kamu sudah tercatat.",
			Status:            "success",
			ExtracurricularID: extracurricularID,
			ProgramName:       result.ProgramName,
			CheckedInAt:       result.CheckedInAt.Format(time.RFC3339),
		})
		return
	case "already_attended":
		w.Header().Set("X-Request-ID", middleware.GetRequestID(r.Context()))
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(SuccessResponse{
			Message:           "Kehadiran kamu sudah tercatat.",
			Status:            "already_attended",
			ExtracurricularID: extracurricularID,
			ProgramName:       result.ProgramName,
		})
		return
	}

	// Error shape: map service codes to HTTP status per the shared contract.
	status := http.StatusGone
	message := "Kehadiran belum dapat disimpan. Coba lagi."
	switch result.ErrorCode {
	case ErrAccountDisabled:
		status = http.StatusForbidden
		message = "Akun siswa tidak aktif atau belum disetujui."
	case ErrNotExtracurricularMember:
		status = http.StatusForbidden
		message = "Kamu belum terdaftar di ekskul ini. Daftar dahulu sebelum bisa absen."
	case ErrQRExpired:
		status = http.StatusGone
		message = "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru."
	case ErrQRInvalid:
		status = http.StatusBadRequest
		message = "QR kehadiran tidak valid."
	case ErrAttendanceClosed:
		status = http.StatusGone
		message = "Sesi absensi sudah ditutup atau belum aktif."
	case ErrDatabaseUnavailable:
		status = http.StatusServiceUnavailable
		message = "Sistem kehadiran sedang bermasalah."
	case ErrInternalError:
		status = http.StatusInternalServerError
		message = "Sistem kehadiran sedang bermasalah."
	default:
		status = http.StatusInternalServerError
		message = "Sistem kehadiran sedang bermasalah."
	}

	h.logger.Warn("attendance scan rejected",
		slog.String("requestId", middleware.GetRequestID(r.Context())),
		slog.String("errorCode", string(result.ErrorCode)),
		slog.Int("status", status))
	WriteError(w, r, status, result.ErrorCode, message)
}

// clientRemoteAddr returns the caller address trimmed to fit the
// attendances.ip_address varchar(45) column.
func clientRemoteAddr(r *http.Request) string {
	addr := r.RemoteAddr
	if i := strings.LastIndex(addr, ":"); i != -1 {
		addr = addr[:i]
	}
	addr = strings.TrimSpace(addr)
	const maxLen = 45
	if len(addr) > maxLen {
		addr = addr[:maxLen]
	}
	return addr
}

// configuredAppOrigin returns the canonical app origin (NEXT_PUBLIC_APP_URL,
// the same value the Next.js QR builder signs into tokens) so QR origin
// validation matches even when the request itself carries no Origin header.
func configuredAppOrigin() string {
	raw := os.Getenv("NEXT_PUBLIC_APP_URL")
	if raw == "" {
		raw = os.Getenv("EXISEL_APP_URL")
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}
