package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/namsel/exisel/backend-go/internal/auth"
)

func TestExtractToken(t *testing.T) {
	req, _ := http.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer test-token")

	token := extractToken(req)
	if token != "test-token" {
		t.Errorf("expected test-token, got %s", token)
	}
}

// The session cookie is "exisel_session" (Next.js session-core.ts and the
// default in config.SessionCookieName). Extracting it must work by default.
func TestExtractToken_DefaultExiselSessionCookie(t *testing.T) {
	req, _ := http.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "exisel_session", Value: "cookie-token"})

	token := extractToken(req)
	if token != "cookie-token" {
		t.Errorf("expected cookie-token from exisel_session cookie, got %q", token)
	}
}

// The old cookie name "session_token" must NOT be read — that was the bug
// (handler auth always missed the real session cookie).
func TestExtractToken_LegacySessionTokenCookieIgnored(t *testing.T) {
	req, _ := http.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: "legacy-token"})

	token := extractToken(req)
	if token != "" {
		t.Errorf("expected empty token (legacy cookie name ignored), got %q", token)
	}
}

// SetSessionCookieName allows the config-derived cookie name to override the
// default, matching cfg.SessionCookieName wiring.
func TestSetSessionCookieName_Override(t *testing.T) {
	original := sessionCookieName
	defer SetSessionCookieName(original)

	req, _ := http.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "custom_session", Value: "custom-token"})

	SetSessionCookieName("custom_session")
	if got := extractToken(req); got != "custom-token" {
		t.Errorf("expected custom-token from custom_session cookie, got %q", got)
	}

	// Empty override keeps the current value (does not blank it).
	SetSessionCookieName("")
	if got := extractToken(req); got != "custom-token" {
		t.Errorf("expected custom-token preserved after empty override, got %q", got)
	}
}

func TestRequireAuth_MissingTokenUnauthorized(t *testing.T) {
	// With a nil db the auth service cannot validate; a request with no
	// Authorization header and no session cookie must be rejected with 401.
	authService := auth.NewService(nil, nil, "exisel_session")

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("expected handler NOT to be called without a token")
		w.WriteHeader(http.StatusOK)
	})
	handler := RequireAuth(authService)(next)

	req, _ := http.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without token, got %d", rr.Code)
	}
}

func TestRequireRole(t *testing.T) {
	handler := RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req, _ := http.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), UserContextKey, &auth.Session{Role: "user"})
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("Expected 403, got %d", rr.Code)
	}

	req2, _ := http.NewRequest("GET", "/", nil)
	ctx2 := context.WithValue(req2.Context(), UserContextKey, &auth.Session{Role: "admin"})
	req2 = req2.WithContext(ctx2)
	rr2 := httptest.NewRecorder()

	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr2.Code)
	}
}
// skipped: RequireAuth full test with DB mock, add when mock DB exists.
