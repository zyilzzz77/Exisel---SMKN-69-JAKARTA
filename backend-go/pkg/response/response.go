package response

import (
	"encoding/json"
	"net/http"
)

// APIResponse matches Exisel Core standard API response structure.
type APIResponse struct {
	OK      bool        `json:"ok"`
	Data    interface{} `json:"data,omitempty"`
	Code    string      `json:"code,omitempty"`
	Message string      `json:"message,omitempty"`
}

// JSON sends a standard JSON response with 2xx HTTP status and ok: true.
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		OK:   true,
		Data: data,
	})
}

// Success sends a 200 OK standard JSON response.
func Success(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, data)
}

// Created sends a 201 Created standard JSON response.
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, data)
}

// Error sends a standard error JSON response with ok: false, error code, and human-readable message.
func Error(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		OK:      false,
		Code:    code,
		Message: message,
	})
}

// Standard helper error functions matching Exisel standard codes

func Unauthorized(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Unauthorized access"
	}
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func Forbidden(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Forbidden access"
	}
	Error(w, http.StatusForbidden, "FORBIDDEN", message)
}

func BadRequest(w http.ResponseWriter, code, message string) {
	if code == "" {
		code = "VALIDATION_ERROR"
	}
	Error(w, http.StatusBadRequest, code, message)
}

func RateLimited(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Too many requests. Please try again later."
	}
	Error(w, http.StatusTooManyRequests, "RATE_LIMITED", message)
}

func InternalError(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Internal server error"
	}
	Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}

func ServiceUnavailable(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Service unavailable"
	}
	Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message)
}
