package auth

import (
	"net/http"
	"strings"
)

// ExtractTokenFromRequest extracts the session token from either:
// 1. Authorization: Bearer <token>
// 2. Cookie with the given cookieName (defaults to "exisel_session" if empty)
func ExtractTokenFromRequest(r *http.Request, cookieName string) string {
	if cookieName == "" {
		cookieName = "exisel_session"
	}

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token != "" {
			return token
		}
	}

	if cookie, err := r.Cookie(cookieName); err == nil {
		token := strings.TrimSpace(cookie.Value)
		if token != "" {
			return token
		}
	}

	return ""
}
