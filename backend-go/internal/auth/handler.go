package auth

import (
	"net/http"

	"github.com/namsel/exisel/backend-go/pkg/response"
)

// Handler provides HTTP endpoints for session validation.
type Handler struct {
	authService *Service
}

// NewHandler creates a new auth Handler.
func NewHandler(authService *Service) *Handler {
	return &Handler{authService: authService}
}

// ValidateSessionResponse represents the data payload for session validation.
type ValidateSessionResponse struct {
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	SessionID string `json:"session_id"`
	ExpiresAt string `json:"expires_at"`
}

// HandleValidateSession handles GET /api/core/v1/session/validate
func (h *Handler) HandleValidateSession(w http.ResponseWriter, r *http.Request) {
	token := ExtractTokenFromRequest(r, h.authService.CookieName())
	if token == "" {
		response.Unauthorized(w, "Missing session token")
		return
	}

	session, err := h.authService.ValidateSession(r.Context(), token)
	if err != nil {
		response.Unauthorized(w, err.Error())
		return
	}

	res := ValidateSessionResponse{
		UserID:    session.UserID,
		Role:      session.Role,
		Status:    session.Status,
		SessionID: session.ID,
		ExpiresAt: session.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Success(w, res)
}
