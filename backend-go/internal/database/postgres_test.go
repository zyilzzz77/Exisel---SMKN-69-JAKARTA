package database

import (
	"context"
	"testing"
	"time"
)

func TestDefaultPoolConfig(t *testing.T) {
	cfg := DefaultPoolConfig()
	if cfg.MaxConns != 30 {
		t.Errorf("expected MaxConns 30, got %d", cfg.MaxConns)
	}
	if cfg.MinConns != 5 {
		t.Errorf("expected MinConns 5, got %d", cfg.MinConns)
	}
	if cfg.MaxConnLifetime != 30*time.Minute {
		t.Errorf("expected MaxConnLifetime 30m, got %v", cfg.MaxConnLifetime)
	}
	if cfg.MaxConnIdleTime != 5*time.Minute {
		t.Errorf("expected MaxConnIdleTime 5m, got %v", cfg.MaxConnIdleTime)
	}
}

func TestNewEmptyURL(t *testing.T) {
	_, err := New(context.Background(), "")
	if err == nil {
		t.Error("expected error for empty database URL, got nil")
	}
}
