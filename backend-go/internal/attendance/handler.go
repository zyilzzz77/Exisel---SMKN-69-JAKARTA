package attendance

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/namsel/exisel/backend-go/internal/qr"
)

type Handler struct {
	service *Service
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{
		service: NewService(db),
	}
}

type ScanRequest struct {
	Token string `json:"token"`
}

type ErrorResponse struct {
	Message string `json:"message"`
	Error   string `json:"error"`
}

type SuccessResponse struct {
	Message           string `json:"message"`
	Status            string `json:"status"`
	ExtracurricularID string `json:"extracurricularId"`
	ProgramName       string `json:"programName"`
	CheckedInAt       string `json:"checkedInAt,omitempty"`
}

func (h *Handler) HandleScan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	// 1. Decode request
	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "Permintaan tidak valid.",
			Error:   "QR_INVALID",
		})
		return
	}
	
	req.Token = strings.TrimSpace(req.Token)
	if len(req.Token) > 512 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "QR kehadiran tidak valid.",
			Error:   "QR_INVALID",
		})
		return
	}

	// 2. Validate session (auth middleware should have set this)
	// ponytail: skipped auth validation via context, add when auth middleware is implemented by Subagent 3
	userID := "mock-user-id" // Placeholder
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "Silakan login untuk melanjutkan absensi.",
			Error:   "LOGIN_REQUIRED",
		})
		return
	}

	// 3. Rate limiting 
	// ponytail: skipped rate limiting, add when Redis rate limiter is implemented

	// 4. Validate QR Token structural parsing to get EID before DB
	tokenURL, err := r.URL.Parse(req.Token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "QR kehadiran tidak valid.",
			Error:   "QR_INVALID",
		})
		return
	}
	extracurricularID := tokenURL.Query().Get("e")
	dateKey := tokenURL.Query().Get("d")

	// 5. Fetch Session Nonce (Ideally from DB, but simplifying as per processAttendance requirements for subagent 4)
	// Actually we need to fetch the session nonce first to validate QR.
	var sessionID string
	var sessionNonce string
	err = h.service.db.QueryRow(r.Context(), `
		SELECT id, code FROM "AttendanceSession" 
		WHERE "extracurricularId" = $1 AND "sessionDate" = $2::date
	`, extracurricularID, dateKey).Scan(&sessionID, &sessionNonce)
	
	if err != nil {
		w.WriteHeader(http.StatusGone)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "Sesi absensi sudah ditutup atau belum aktif.",
			Error:   "ATTENDANCE_CLOSED",
		})
		return
	}

	// 6. Validate QR cryptographically
	host := r.Host
	if host == "" {
		host = "localhost:8080"
	}
	
	origin := r.Header.Get("Origin")
	
	isValid := qr.ValidateAttendanceQRPayload(req.Token, qr.ValidateInput{
		ExtracurricularID: extracurricularID,
		DateKey:           dateKey,
		SessionNonce:      sessionNonce,
		Now:               time.Now().UnixMilli(),
		AllowedOrigins:    []string{origin},
		Host:              host,
	})

	if !isValid {
		w.WriteHeader(http.StatusGone)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: "QR sudah berganti atau tidak valid. Silakan pindai QR terbaru.",
			Error:   "QR_EXPIRED",
		})
		return
	}

	// 7. Process Attendance
	ipAddress := r.RemoteAddr
	userAgent := r.UserAgent()
	
	result, err := h.service.ProcessAttendance(r.Context(), ProcessInput{
		UserID:              userID,
		AttendanceSessionID: sessionID,
		IPAddress:           &ipAddress,
		UserAgent:           &userAgent,
	})

	if err != nil || result.Status == "error" {
		status := http.StatusGone
		msg := "Kehadiran belum dapat disimpan. Coba lagi."
		code := string(result.ErrorCode)
		
		if result.ErrorCode == ErrNotExtracurricularMember {
			status = http.StatusForbidden
			msg = "Kamu belum terdaftar di ekskul ini. Daftar dahulu sebelum bisa absen."
		} else if result.ErrorCode == ErrAccountDisabled {
			status = http.StatusForbidden
			msg = "Akun siswa tidak aktif atau belum disetujui."
		}
		
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(ErrorResponse{
			Message: msg,
			Error:   code,
		})
		return
	}

	if result.Status == "already_attended" {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(SuccessResponse{
			Message:           "Kehadiran kamu sudah tercatat.",
			Status:            "already_attended",
			ExtracurricularID: extracurricularID,
			ProgramName:       result.ProgramName,
		})
		return
	}

	// 8. Cache invalidation hook (placeholder)
	// ponytail: skipped actual cache invalidation, add when Redis cache package is ready

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message:           "Kehadiran kamu sudah tercatat.",
		Status:            "success",
		ExtracurricularID: extracurricularID,
		ProgramName:       result.ProgramName,
		CheckedInAt:       result.CheckedInAt.Format(time.RFC3339),
	})
}
