package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/namsel/exisel/backend-go/internal/attendance"
	"github.com/namsel/exisel/backend-go/internal/cache"
	"github.com/namsel/exisel/backend-go/internal/config"
	"github.com/namsel/exisel/backend-go/internal/database"
	"github.com/namsel/exisel/backend-go/internal/middleware"
	"github.com/namsel/exisel/backend-go/pkg/response"
)

// Server holds the dependencies and router for exisel-core.
type Server struct {
	cfg    *config.Config
	db     *pgxpool.Pool
	redis  *cache.Client
	logger *slog.Logger
	Router *chi.Mux
}

// NewServer sets up Chi router, middlewares, and routes.
func NewServer(cfg *config.Config, db *pgxpool.Pool, redisClient *cache.Client, logger *slog.Logger) *Server {
	if logger == nil {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}

	s := &Server{
		cfg:    cfg,
		db:     db,
		redis:  redisClient,
		logger: logger,
		Router: chi.NewRouter(),
	}

	s.setupMiddlewares()
	s.setupRoutes()

	return s
}

func (s *Server) setupMiddlewares() {
	// Standard Chi middlewares
	s.Router.Use(middleware.RequestID)
	s.Router.Use(chimiddleware.RealIP)
	s.Router.Use(middleware.StructuredLogger(s.logger))
	s.Router.Use(chimiddleware.Recoverer)
	s.Router.Use(chimiddleware.Timeout(30 * time.Second))

	// CORS middleware
	s.Router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := s.cfg.CORSAllowedOrigin
			if origin == "" {
				origin = "*"
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-Request-ID, Idempotency-Key")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})
}

func (s *Server) setupRoutes() {
	// Root health checks
	s.Router.Get("/healthz", s.handleHealthz)
	s.Router.Get("/readyz", s.handleReadyz)
	s.Router.Get("/health", s.handleHealthz)
	s.Router.Get("/ready", s.handleReadyz)

	// Base API core prefix
	s.Router.Route("/api/core/v1", func(r chi.Router) {
		r.Get("/health", s.handleHealthz)
		
		attendanceHandler := attendance.NewHandler(s.db)
		r.Post("/attendance/scan", attendanceHandler.HandleScan)
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	dbStatus := "healthy"
	redisStatus := "healthy"
	isReady := true

	// Check Postgres
	if s.db == nil {
		dbStatus = "unconnected"
		isReady = false
	} else {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.db.Ping(ctx); err != nil {
			dbStatus = fmt.Sprintf("unhealthy: %v", err)
			isReady = false
		}
	}

	// Check Redis (graceful: readyz warns if redis is down but checks status)
	if s.redis == nil || s.redis.Raw() == nil {
		redisStatus = "disabled"
	} else {
		ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
		defer cancel()
		if err := s.redis.Ping(ctx); err != nil {
			redisStatus = fmt.Sprintf("unhealthy: %v", err)
		}
	}

	statusMap := map[string]interface{}{
		"ready":    isReady,
		"database": dbStatus,
		"redis":    redisStatus,
		"time":     time.Now().UTC().Format(time.RFC3339),
	}

	if !isReady {
		response.Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Database not ready")
		return
	}

	response.Success(w, statusMap)
}

func Run() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		logger.Error("Failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Initialize DB pool
	var dbPool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		pool, err := database.New(ctx, cfg.DatabaseURL)
		if err != nil {
			logger.Warn("Failed to connect to database. Starting with degraded DB state.", slog.Any("error", err))
		} else {
			dbPool = pool
			defer dbPool.Close()
			logger.Info("Connected to PostgreSQL pool")
		}
	} else {
		logger.Warn("DATABASE_URL not configured")
	}

	// Initialize Redis client
	var redisClient *cache.Client
	if cfg.RedisURL != "" {
		rClient, err := cache.New(ctx, cfg.RedisURL)
		if err != nil {
			logger.Warn("Failed to connect to Redis. Starting with cache fallback.", slog.Any("error", err))
		} else {
			redisClient = rClient
			defer redisClient.Close()
			logger.Info("Connected to Redis")
		}
	} else {
		logger.Warn("REDIS_URL not configured, using in-memory / noop cache fallback")
	}

	srvInstance := NewServer(cfg, dbPool, redisClient, logger)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           srvInstance.Router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Server goroutine
	go func() {
		logger.Info("Server listening", slog.String("port", cfg.Port), slog.String("env", cfg.Environment))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Server error", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	// Graceful shutdown handling SIGINT, SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server shutdown failed", slog.Any("error", err))
	}

	logger.Info("Server exited properly")
}
