package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
	bytesWritten int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += n
	return n, err
}

// StructuredLogger logs structured request/response info using standard slog, sanitizing sensitive data.
func StructuredLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			reqID := GetRequestID(r.Context())

			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(rw, r)

			duration := time.Since(start)

			// Log level: INFO for 2xx/3xx, WARN for 4xx, ERROR for 5xx
			level := slog.LevelInfo
			if rw.statusCode >= 500 {
				level = slog.LevelError
			} else if rw.statusCode >= 400 {
				level = slog.LevelWarn
			}

			logger.Log(r.Context(), level, "HTTP request handled",
				slog.String("request_id", reqID),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.String("remote_ip", r.RemoteAddr),
				slog.Int("status", rw.statusCode),
				slog.Int64("latency_ms", duration.Milliseconds()),
				slog.Int("bytes", rw.bytesWritten),
			)
		})
	}
}
