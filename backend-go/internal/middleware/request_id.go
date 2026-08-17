package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

type reqIDContextKey struct{}

var requestIDCtxKey = reqIDContextKey{}

// RequestID extracts X-Request-ID from header or generates a cryptographically random 16-byte hex ID.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			var b [16]byte
			_, _ = rand.Read(b[:])
			reqID = hex.EncodeToString(b[:])
		}

		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), requestIDCtxKey, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetRequestID retrieves the request ID from context.
func GetRequestID(ctx context.Context) string {
	if reqID, ok := ctx.Value(requestIDCtxKey).(string); ok {
		return reqID
	}
	return ""
}
