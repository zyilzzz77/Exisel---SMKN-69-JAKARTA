package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/namsel/exisel/backend-go/internal/auth"
	"github.com/namsel/exisel/backend-go/pkg/response"
)

type contextKey string

const UserContextKey contextKey = "user"

// DefaultSessionCookieName matches the Next.js session cookie
// (src/lib/auth/session-core.ts) and config default (SESSION_COOKIE_NAME).
const DefaultSessionCookieName = "exisel_session"

// sessionCookieName is the cookie read by extractToken. The API process wires
// it from config (config.SessionCookieName) via SetSessionCookieName.
// RequireAuth keeps using it so its signature does not change.
var sessionCookieName = DefaultSessionCookieName

// SetSessionCookieName overrides the session cookie name read by RequireAuth.
// Empty values keep the default ("exisel_session").
func SetSessionCookieName(name string) {
	name = strings.TrimSpace(name)
	if name != "" {
		sessionCookieName = name
	}
}

// RequireAuth middleware verifies the session token and adds user info to context
func RequireAuth(authService *auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing session token")
				return
			}

			session, err := authService.ValidateSession(r.Context(), token)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, session)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole middleware ensures the authenticated user has the required role
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session, ok := r.Context().Value(UserContextKey).(*auth.Session)
			if !ok || session == nil {
				response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing user context")
				return
			}

			if session.Role != role {
				response.Error(w, http.StatusForbidden, "FORBIDDEN", "Insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func extractToken(r *http.Request) string {
	// Reuses the shared extractor: Authorization Bearer first, then the
	// configured session cookie (default "exisel_session", the real cookie
	// set by the Next.js session layer).
	return auth.ExtractTokenFromRequest(r, sessionCookieName)
}
