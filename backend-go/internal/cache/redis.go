package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Client wraps redis.Client and provides resilient cache operations with graceful fallback.
type Client struct {
	rdb *redis.Client
}

// New creates a new Redis client wrapper.
func New(ctx context.Context, redisURL string) (*Client, error) {
	if redisURL == "" {
		return nil, fmt.Errorf("REDIS_URL is not set")
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse redis config: %w", err)
	}

	// Default sane timeouts
	if opts.DialTimeout == 0 {
		opts.DialTimeout = 2 * time.Second
	}
	if opts.ReadTimeout == 0 {
		opts.ReadTimeout = 500 * time.Millisecond
	}
	if opts.WriteTimeout == 0 {
		opts.WriteTimeout = 500 * time.Millisecond
	}

	client := redis.NewClient(opts)

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		client.Close()
		return nil, fmt.Errorf("unable to ping redis: %w", err)
	}

	return &Client{rdb: client}, nil
}

// Raw returns the underlying *redis.Client (may be nil if Redis is disabled/unreachable).
func (c *Client) Raw() *redis.Client {
	if c == nil {
		return nil
	}
	return c.rdb
}

// Close closes the underlying Redis client connection.
func (c *Client) Close() error {
	if c == nil || c.rdb == nil {
		return nil
	}
	return c.rdb.Close()
}

// Ping checks if Redis is responsive. Returns error if client is nil or unreachable.
func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.rdb == nil {
		return fmt.Errorf("redis client is not initialized")
	}
	return c.rdb.Ping(ctx).Err()
}

// Get gets key value with graceful fallback if Redis is nil or fails.
func (c *Client) Get(ctx context.Context, key string) (string, error) {
	if c == nil || c.rdb == nil {
		return "", redis.Nil
	}
	return c.rdb.Get(ctx, key).Result()
}

// Set sets key-value with TTL. Silently ignores if Redis is not configured or returns error.
func (c *Client) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if c == nil || c.rdb == nil {
		// graceful fallback: no-op
		return nil
	}
	return c.rdb.Set(ctx, key, value, expiration).Err()
}

// Del deletes keys. Silently ignores if Redis is not configured.
func (c *Client) Del(ctx context.Context, keys ...string) error {
	if c == nil || c.rdb == nil {
		// graceful fallback: no-op
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}
