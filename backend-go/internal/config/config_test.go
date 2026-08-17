package config

import (
	"os"
	"testing"
)

func TestConfigLoadDefaults(t *testing.T) {
	os.Unsetenv("PORT")
	os.Unsetenv("SESSION_COOKIE_NAME")
	os.Unsetenv("NODE_ENV")
	os.Unsetenv("ENVIRONMENT")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error loading config: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default Port 8080, got %s", cfg.Port)
	}
	if cfg.SessionCookieName != "exisel_session" {
		t.Errorf("expected default SessionCookieName 'exisel_session', got %s", cfg.SessionCookieName)
	}
	if cfg.Environment != "development" {
		t.Errorf("expected default Environment 'development', got %s", cfg.Environment)
	}
}
