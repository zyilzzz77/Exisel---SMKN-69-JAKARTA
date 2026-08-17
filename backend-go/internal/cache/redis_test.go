package cache

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

func TestNewEmptyRedisURL(t *testing.T) {
	_, err := New(context.Background(), "")
	if err == nil {
		t.Error("expected error for empty redis URL, got nil")
	}
}

func TestNilClientFallback(t *testing.T) {
	var client *Client = nil

	if client.Raw() != nil {
		t.Error("expected nil raw client")
	}

	if err := client.Close(); err != nil {
		t.Errorf("expected nil error on Close, got %v", err)
	}

	if err := client.Ping(context.Background()); err == nil {
		t.Error("expected error on Ping with nil client, got nil")
	}

	val, err := client.Get(context.Background(), "test-key")
	if err != redis.Nil {
		t.Errorf("expected redis.Nil, got %v", err)
	}
	if val != "" {
		t.Errorf("expected empty string, got %s", val)
	}

	if err := client.Set(context.Background(), "test-key", "value", time.Minute); err != nil {
		t.Errorf("expected nil error on Set fallback, got %v", err)
	}

	if err := client.Del(context.Background(), "test-key"); err != nil {
		t.Errorf("expected nil error on Del fallback, got %v", err)
	}
}
