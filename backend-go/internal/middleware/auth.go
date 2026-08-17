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
	// First check Authorization header
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	// Then check cookies (adjust cookie name based on actual Next.js auth setup, e.g., NextAuth.js uses next-auth.session-token)
	cookie, err := r.Cookie("session_token")
	if err == nil {
		return cookie.Value
	}

	return ""
}
