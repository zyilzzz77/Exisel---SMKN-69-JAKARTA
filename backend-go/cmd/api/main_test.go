package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/namsel/exisel/backend-go/internal/config"
	"github.com/namsel/exisel/backend-go/pkg/response"
)

func TestHealthzEndpoint(t *testing.T) {
	cfg := &config.Config{
		Port:        "8080",
		Environment: "test",
	}

	srv := NewServer(cfg, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	srv.Router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var res response.APIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !res.OK {
		t.Errorf("expected OK=true, got %v", res.OK)
	}

	dataMap, ok := res.Data.(map[string]interface{})
	if !ok || dataMap["status"] != "ok" {
		t.Errorf("expected status=ok in data, got %v", res.Data)
	}
}

func TestReadyzWithoutDB(t *testing.T) {
	cfg := &config.Config{
		Port:        "8080",
		Environment: "test",
	}

	srv := NewServer(cfg, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	srv.Router.ServeHTTP(rec, req)

	// Since DB is nil, readyz should return 503 Service Unavailable
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status 503 when DB is nil, got %d", rec.Code)
	}

	var res response.APIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.OK {
		t.Errorf("expected OK=false when DB is nil, got %v", res.OK)
	}
	if res.Code != "SERVICE_UNAVAILABLE" {
		t.Errorf("expected SERVICE_UNAVAILABLE, got %s", res.Code)
	}
}

func TestCORSOptions(t *testing.T) {
	cfg := &config.Config{
		Port:              "8080",
		Environment:       "test",
		CORSAllowedOrigin: "http://localhost:3000",
	}

	srv := NewServer(cfg, nil, nil, nil)

	req := httptest.NewRequest(http.MethodOptions, "/healthz", nil)
	rec := httptest.NewRecorder()

	srv.Router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200 for OPTIONS, got %d", rec.Code)
	}

	if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:3000" {
		t.Errorf("expected Access-Control-Allow-Origin http://localhost:3000, got %s", origin)
	}
}

// With a nil DB pool the attendance scan route must NOT panic (nil-guarded),
// and RequireAuth must reject an unauthenticated request with 401.
func TestAttendanceScanWithoutTokenOrDB(t *testing.T) {
	cfg := &config.Config{
		Port:              "8080",
		Environment:       "test",
		SessionCookieName: "exisel_session",
	}

	srv := NewServer(cfg, nil, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/core/v1/attendance/scan", nil)
	rec := httptest.NewRecorder()

	// Must not panic despite nil db pool.
	srv.Router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for scan without session token, got %d", rec.Code)
	}
}

