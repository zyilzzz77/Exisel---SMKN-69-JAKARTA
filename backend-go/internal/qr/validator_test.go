package qr

import (
	"fmt"
	"os"
	"testing"
	"time"
)

func TestValidateAttendanceQRPayload(t *testing.T) {
	os.Setenv("SESSION_SECRET", "supersecretkeythatisatleast32charslong")
	
	now := time.Now().UnixMilli()
	bucket := now / RotationMS
	
	extracurricularID := "ekskul-123"
	dateKey := "2026-08-17"
	sessionNonce := "nonce456"
	
	sig := signature(extracurricularID, dateKey, sessionNonce, bucket)
	
	validPayload := fmt.Sprintf("http://localhost:3000/attendance/scan?v=%s&e=%s&d=%s&t=%d&s=%s", QRVersion, extracurricularID, dateKey, bucket, sig)
	
	isValid := ValidateAttendanceQRPayload(validPayload, ValidateInput{
		ExtracurricularID: extracurricularID,
		DateKey:           dateKey,
		SessionNonce:      sessionNonce,
		Now:               now,
		AllowedOrigins:    []string{"http://localhost:3000"},
		Host:              "localhost",
	})
	
	if !isValid {
		t.Error("Expected payload to be valid")
	}
}