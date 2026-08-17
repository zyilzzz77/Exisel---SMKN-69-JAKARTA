package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestIDMiddleware(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := GetRequestID(r.Context())
		if reqID == "" {
			t.Error("expected non-empty request id in context")
		}
		w.WriteHeader(http.StatusOK)
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	handler.ServeHTTP(rec, req)

	headerReqID := rec.Header().Get("X-Request-ID")
	if headerReqID == "" {
		t.Error("expected X-Request-ID response header")
	}
}

func TestRequestIDPreserved(t *testing.T) {
	customID := "custom-req-12345"
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := GetRequestID(r.Context())
		if reqID != customID {
			t.Errorf("expected %s, got %s", customID, reqID)
		}
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Request-ID", customID)
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("X-Request-ID") != customID {
		t.Errorf("expected header %s, got %s", customID, rec.Header().Get("X-Request-ID"))
	}
}

func TestStructuredLogger(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	handler := StructuredLogger(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	handler.ServeHTTP(rec, req)

	if !bytes.Contains(buf.Bytes(), []byte("/healthz")) {
		t.Errorf("expected log to contain /healthz, got: %s", buf.String())
	}
}

func TestRateLimiterNilClientGraceful(t *testing.T) {
	limiter := RateLimiter(nil, "test", 5, 0)
	called := false
	handler := limiter(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("expected handler to be called despite nil redis client")
	}
}
