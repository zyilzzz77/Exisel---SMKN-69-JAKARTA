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

	req2, _ := http.NewRequest("GET", "/", nil)
	req2.AddCookie(&http.Cookie{Name: "session_token", Value: "cookie-token"})

	token2 := extractToken(req2)
	if token2 != "cookie-token" {
		t.Errorf("expected cookie-token, got %s", token2)
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
