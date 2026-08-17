package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSuccessResponse(t *testing.T) {
	rec := httptest.NewRecorder()
	Success(rec, map[string]string{"foo": "bar"})

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var res APIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode json response: %v", err)
	}

	if !res.OK {
		t.Errorf("expected res.OK == true, got false")
	}

	dataMap, ok := res.Data.(map[string]interface{})
	if !ok || dataMap["foo"] != "bar" {
		t.Errorf("unexpected data payload: %v", res.Data)
	}
}

func TestErrorResponse(t *testing.T) {
	rec := httptest.NewRecorder()
	Error(rec, http.StatusBadRequest, "INVALID_QR", "Invalid token format")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}

	var res APIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode json response: %v", err)
	}

	if res.OK {
		t.Errorf("expected res.OK == false, got true")
	}
	if res.Code != "INVALID_QR" {
		t.Errorf("expected code INVALID_QR, got %s", res.Code)
	}
	if res.Message != "Invalid token format" {
		t.Errorf("expected message 'Invalid token format', got %s", res.Message)
	}
}

func TestHelperResponses(t *testing.T) {
	tests := []struct {
		fn       func(w http.ResponseWriter)
		status   int
		code     string
		defMsg   string
	}{
		{func(w http.ResponseWriter) { Unauthorized(w, "") }, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized access"},
		{func(w http.ResponseWriter) { Forbidden(w, "") }, http.StatusForbidden, "FORBIDDEN", "Forbidden access"},
		{func(w http.ResponseWriter) { BadRequest(w, "", "bad input") }, http.StatusBadRequest, "VALIDATION_ERROR", "bad input"},
		{func(w http.ResponseWriter) { RateLimited(w, "") }, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests. Please try again later."},
		{func(w http.ResponseWriter) { InternalError(w, "") }, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error"},
		{func(w http.ResponseWriter) { ServiceUnavailable(w, "") }, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Service unavailable"},
	}

	for _, tt := range tests {
		rec := httptest.NewRecorder()
		tt.fn(rec)

		if rec.Code != tt.status {
			t.Errorf("expected status %d, got %d", tt.status, rec.Code)
		}

		var res APIResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
			t.Fatalf("failed to decode json response: %v", err)
		}
		if res.OK {
			t.Errorf("expected ok=false for error response")
		}
		if res.Code != tt.code {
			t.Errorf("expected code %s, got %s", tt.code, res.Code)
		}
	}
}
