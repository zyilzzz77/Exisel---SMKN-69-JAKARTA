package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/namsel/exisel/backend-go/internal/cache"
	"github.com/namsel/exisel/backend-go/pkg/response"
)

// RateLimiter provides sliding-window / fixed-window rate limiting backed by Redis.
// Falls back gracefully if Redis is unavailable.
func RateLimiter(cacheClient *cache.Client, keyPrefix string, limit int64, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If Redis is not connected, fail open (graceful fallback)
			if cacheClient == nil || cacheClient.Raw() == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Key by Client IP or Authorization identifier
			ip := r.RemoteAddr
			if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			} else if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
				ip = fwd
			}

			key := fmt.Sprintf("rl:%s:%s", keyPrefix, ip)

			ctx, cancel := context.WithTimeout(r.Context(), 300*time.Millisecond)
			defer cancel()

			count, err := cacheClient.Raw().Incr(ctx, key).Result()
			if err != nil {
				// On Redis error, fail open
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				cacheClient.Raw().Expire(ctx, key, window)
			}

			if count > limit {
				response.RateLimited(w, "Rate limit exceeded. Please retry later.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
