package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrInvalidSession  = errors.New("invalid or expired session")
	ErrExpiredSession  = errors.New("session expired")
	ErrRevokedSession  = errors.New("session revoked")
	ErrUserInactive    = errors.New("user account is inactive")
	ErrUserNotApproved = errors.New("user status is not approved")
)

const (
	SessionCachePrefix = "session:"
	MaxSessionCacheTTL = 15 * time.Minute
	LastSeenThrottle   = 15 * time.Minute
)

// DBTX is the minimal database interface required by auth service.
// *pgxpool.Pool and pgx.Tx implement this interface.
type DBTX interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// CacheClient is the cache interface required by auth service.
type CacheClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Del(ctx context.Context, keys ...string) error
}

// Session represents an authenticated session with user attributes.
type Session struct {
	ID         string     `json:"session_id"`
	UserID     string     `json:"user_id"`
	Role       string     `json:"role"`
	Status     string     `json:"status"`
	IsActive   bool       `json:"is_active"`
	ExpiresAt  time.Time  `json:"expires_at"`
	LastSeenAt *time.Time `json:"last_seen_at,omitempty"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	TokenHash  string     `json:"token_hash,omitempty"`
}

// IsApprovedStudent returns true if the session belongs to an active, approved student.
func (s *Session) IsApprovedStudent() bool {
	return s != nil && s.Role == "STUDENT" && s.Status == "APPROVED" && s.IsActive
}

// IsAdmin returns true if the session belongs to an active admin.
func (s *Session) IsAdmin() bool {
	return s != nil && s.Role == "ADMIN" && s.IsActive
}

// cachedSession is the JSON-serializable representation stored in Redis.
type cachedSession struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	IsActive  bool      `json:"is_active"`
	ExpiresAt time.Time `json:"expires_at"`
	TokenHash string    `json:"token_hash"`
}

// Service provides session validation, cache management, and revocation.
type Service struct {
	db         DBTX
	cache      CacheClient
	cookieName string
}

// NewService creates a new auth Service instance.
func NewService(db DBTX, cacheClient CacheClient, cookieName string) *Service {
	if cookieName == "" {
		cookieName = "exisel_session"
	}
	return &Service{
		db:         db,
		cache:      cacheClient,
		cookieName: cookieName,
	}
}

// CookieName returns the configured session cookie name.
func (s *Service) CookieName() string {
	return s.cookieName
}

// HashToken matches Next.js SHA-256 session token hashing (session-core.ts:hashSessionToken).
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ValidateSession hashes the raw token and validates the session against Redis and PostgreSQL.
func (s *Service) ValidateSession(ctx context.Context, token string) (*Session, error) {
	trimmed := strings.TrimSpace(token)
	if len(trimmed) < 32 {
		return nil, ErrInvalidSession
	}

	tokenHash := HashToken(trimmed)
	return s.ValidateTokenHash(ctx, tokenHash)
}

// ValidateTokenHash validates a pre-hashed token against Redis and PostgreSQL.
func (s *Service) ValidateTokenHash(ctx context.Context, tokenHash string) (*Session, error) {
	if tokenHash == "" {
		return nil, ErrInvalidSession
	}

	// 1. Try Redis Cache
	if s.cache != nil {
		cacheKey := SessionCachePrefix + tokenHash
		if cachedStr, err := s.cache.Get(ctx, cacheKey); err == nil && cachedStr != "" {
			var cs cachedSession
			if err := json.Unmarshal([]byte(cachedStr), &cs); err == nil {
				now := time.Now()
				if cs.ExpiresAt.After(now) && cs.IsActive {
					return &Session{
						ID:        cs.ID,
						UserID:    cs.UserID,
						Role:      cs.Role,
						Status:    cs.Status,
						IsActive:  cs.IsActive,
						ExpiresAt: cs.ExpiresAt,
						TokenHash: cs.TokenHash,
					}, nil
				}
				// Expired or inactive in cache -> invalidate cache entry
				_ = s.cache.Del(ctx, cacheKey)
			}
		}
	}

	// 2. Query PostgreSQL
	if s.db == nil {
		return nil, errors.New("database connection is not available")
	}

	query := `
		SELECT 
			s.id, 
			s.user_id, 
			s.expires_at, 
			s.revoked_at, 
			s.last_seen_at, 
			u.role, 
			u.status, 
			u.is_active 
		FROM sessions s 
		JOIN users u ON s.user_id = u.id 
		WHERE s.token_hash = $1
	`

	var session Session
	session.TokenHash = tokenHash

	err := s.db.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID,
		&session.UserID,
		&session.ExpiresAt,
		&session.RevokedAt,
		&session.LastSeenAt,
		&session.Role,
		&session.Status,
		&session.IsActive,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidSession
		}
		return nil, fmt.Errorf("session db query failed: %w", err)
	}

	now := time.Now()

	// 3. Status & Expiry checks
	if session.RevokedAt != nil {
		return nil, ErrRevokedSession
	}

	if !session.ExpiresAt.After(now) {
		return nil, ErrExpiredSession
	}

	if !session.IsActive {
		// Asynchronously revoke session for deactivated user
		go func(sessID string) {
			bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_, _ = s.db.Exec(bgCtx, `UPDATE sessions SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL`, time.Now(), sessID)
		}(session.ID)
		return nil, ErrUserInactive
	}

	// 4. Asynchronous last_seen_at throttle update (e.g. if > 15 mins since last update)
	if session.LastSeenAt == nil || now.Sub(*session.LastSeenAt) > LastSeenThrottle {
		go func(sessID string, updateTime time.Time) {
			bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_, _ = s.db.Exec(bgCtx, `UPDATE sessions SET last_seen_at = $1 WHERE id = $2`, updateTime, sessID)
		}(session.ID, now)
	}

	// 5. Populate Redis Cache
	if s.cache != nil {
		remainingTTL := time.Until(session.ExpiresAt)
		if remainingTTL > 0 {
			ttl := remainingTTL
			if ttl > MaxSessionCacheTTL {
				ttl = MaxSessionCacheTTL
			}

			cs := cachedSession{
				ID:        session.ID,
				UserID:    session.UserID,
				Role:      session.Role,
				Status:    session.Status,
				IsActive:  session.IsActive,
				ExpiresAt: session.ExpiresAt,
				TokenHash: tokenHash,
			}

			if payload, err := json.Marshal(cs); err == nil {
				cacheKey := SessionCachePrefix + tokenHash
				_ = s.cache.Set(ctx, cacheKey, string(payload), ttl)
			}
		}
	}

	return &session, nil
}

// RevokeSession revokes a session by raw token and purges it from cache.
func (s *Service) RevokeSession(ctx context.Context, token string) error {
	tokenHash := HashToken(strings.TrimSpace(token))
	return s.RevokeSessionByHash(ctx, tokenHash)
}

// RevokeSessionByHash revokes a session by token hash.
func (s *Service) RevokeSessionByHash(ctx context.Context, tokenHash string) error {
	if s.cache != nil {
		_ = s.cache.Del(ctx, SessionCachePrefix+tokenHash)
	}

	if s.db != nil {
		_, err := s.db.Exec(ctx, `UPDATE sessions SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL`, time.Now(), tokenHash)
		return err
	}
	return nil
}

// RevokeSessionByID revokes a specific session by its ID.
func (s *Service) RevokeSessionByID(ctx context.Context, sessionID string) error {
	if s.db != nil {
		var tokenHash string
		err := s.db.QueryRow(ctx, `UPDATE sessions SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL RETURNING token_hash`, time.Now(), sessionID).Scan(&tokenHash)
		if err == nil && tokenHash != "" && s.cache != nil {
			_ = s.cache.Del(ctx, SessionCachePrefix+tokenHash)
		}
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	return nil
}

// RevokeUserSessions revokes all active sessions for a user.
func (s *Service) RevokeUserSessions(ctx context.Context, userID string) error {
	if s.db != nil {
		_, err := s.db.Exec(ctx, `UPDATE sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`, time.Now(), userID)
		return err
	}
	return nil
}

// InvalidateCache deletes the Redis cache entry for a given raw token.
func (s *Service) InvalidateCache(ctx context.Context, token string) error {
	if s.cache == nil {
		return nil
	}
	tokenHash := HashToken(strings.TrimSpace(token))
	return s.cache.Del(ctx, SessionCachePrefix+tokenHash)
}

// InvalidateCacheByHash deletes the Redis cache entry for a given token hash.
func (s *Service) InvalidateCacheByHash(ctx context.Context, tokenHash string) error {
	if s.cache == nil {
		return nil
	}
	return s.cache.Del(ctx, SessionCachePrefix+tokenHash)
}
