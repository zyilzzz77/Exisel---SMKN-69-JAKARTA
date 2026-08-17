package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PoolConfig struct {
	MaxConns          int32
	MinConns          int32
	MaxConnLifetime   time.Duration
	MaxConnIdleTime   time.Duration
	HealthCheckPeriod time.Duration
}

func DefaultPoolConfig() PoolConfig {
	return PoolConfig{
		MaxConns:          30,
		MinConns:          5,
		MaxConnLifetime:   30 * time.Minute,
		MaxConnIdleTime:   5 * time.Minute,
		HealthCheckPeriod: 1 * time.Minute,
	}
}

// New creates a new pgxpool.Pool with connection pooling parameters matching Exisel architecture.
func New(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	return NewWithConfig(ctx, databaseURL, DefaultPoolConfig())
}

// NewWithConfig creates a new pgxpool.Pool with customized pool parameters.
func NewWithConfig(ctx context.Context, databaseURL string, poolCfg PoolConfig) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %w", err)
	}

	config.MaxConns = poolCfg.MaxConns
	config.MinConns = poolCfg.MinConns
	config.MaxConnLifetime = poolCfg.MaxConnLifetime
	config.MaxConnIdleTime = poolCfg.MaxConnIdleTime
	config.HealthCheckPeriod = poolCfg.HealthCheckPeriod

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}
