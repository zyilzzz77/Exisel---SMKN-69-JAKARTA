package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	RedisURL          string
	Environment       string
	SessionCookieName string
	SessionSecret     string
	CORSAllowedOrigin string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	cookieName := os.Getenv("SESSION_COOKIE_NAME")
	if cookieName == "" {
		cookieName = "exisel_session"
	}

	env := os.Getenv("NODE_ENV")
	if env == "" {
		env = os.Getenv("ENVIRONMENT")
	}
	if env == "" {
		env = "development"
	}

	corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	return &Config{
		Port:              port,
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		RedisURL:          os.Getenv("REDIS_URL"),
		Environment:       env,
		SessionCookieName: cookieName,
		SessionSecret:     os.Getenv("SESSION_SECRET"),
		CORSAllowedOrigin: corsOrigin,
	}, nil
}
