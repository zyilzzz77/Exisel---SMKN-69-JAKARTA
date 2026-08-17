package qr

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	RotationMS = 25000
	QRVersion  = "1"
	ScanPath   = "/attendance/scan"
)

type ValidateInput struct {
	ExtracurricularID string
	DateKey           string
	SessionNonce      string
	Now               int64
	AllowedOrigins    []string
	Host              string
}

func ValidateAttendanceQRPayload(payload string, input ValidateInput) bool {
	parsedURL, err := url.Parse(payload)
	if err != nil {
		return false
	}

	// Origin validation
	originSet := make(map[string]bool)
	
	// Add allowed origins
	for _, origin := range input.AllowedOrigins {
		if origin != "" {
			originSet[origin] = true
		}
	}

	// Localhost tolerance
	if parsedURL.Hostname() == "localhost" || parsedURL.Hostname() == "127.0.0.1" || parsedURL.Hostname() == "::1" {
		originSet["http://localhost:3000"] = true
		originSet["http://127.0.0.1:3000"] = true
		if parsedURL.Port() != "" {
			originSet["http://localhost:"+parsedURL.Port()] = true
			originSet["http://127.0.0.1:"+parsedURL.Port()] = true
		}
	}
	
	payloadOrigin := fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host)
	if !originSet[payloadOrigin] {
		// ponytail: skipped logging missing origin in qr validator, add when debugging qr scan failures
		return false
	}

	if parsedURL.Path != ScanPath {
		return false
	}

	q := parsedURL.Query()
	if q.Get("v") != QRVersion {
		return false
	}
	if q.Get("e") != input.ExtracurricularID {
		return false
	}
	if q.Get("d") != input.DateKey {
		return false
	}

	bucketText := q.Get("t")
	suppliedSignature := q.Get("s")

	bucket, err := strconv.ParseInt(bucketText, 10, 64)
	if err != nil {
		return false
	}

	now := input.Now
	if now == 0 {
		now = time.Now().UnixMilli()
	}

	currentBucket := now / RotationMS
	
	// Allow current bucket and previous bucket (1 rotation window = 25s tolerance)
	if bucket != currentBucket && bucket != currentBucket-1 {
		return false
	}

	expectedSig := signature(input.ExtracurricularID, input.DateKey, input.SessionNonce, bucket)
	
	// Pad strings if necessary (subtle.ConstantTimeCompare requires equal length)
	if len(suppliedSignature) != len(expectedSig) {
		return false
	}
	
	return subtle.ConstantTimeCompare([]byte(suppliedSignature), []byte(expectedSig)) == 1
}

func signature(extracurricularID, dateKey, sessionNonce string, bucket int64) string {
	message := fmt.Sprintf("%s.%s.%s.%d.%s", QRVersion, extracurricularID, dateKey, bucket, sessionNonce)
	
	secret := os.Getenv("SESSION_SECRET")
	if len(secret) < 32 {
		// ponytail: skipped graceful error handling for missing secret, add when refactoring config validation
		panic("SESSION_SECRET minimal 32 karakter belum dikonfigurasi.")
	}

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	
	// Base64URL encode without padding
	return strings.TrimRight(base64.URLEncoding.EncodeToString(h.Sum(nil)), "=")
}