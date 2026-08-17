package auth

import (
	"testing"
)

// TODO: Add proper test harness with real DB or mock interface
func TestHashToken(t *testing.T) {
	token := "test-token-123"
	hash := HashToken(token)
	if hash == "" || hash == token {
		t.Errorf("Expected hashed token, got %s", hash)
	}
}

// skipped: full DB integration test, add when test container/mock DB is setup.
