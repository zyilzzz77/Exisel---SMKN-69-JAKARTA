# Build stage
# go.mod membutuhkan Go 1.26.1; jangan gunakan image yang lebih lama.
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Arsitektur target (diisi otomatis oleh Docker BuildKit; default amd64).
ARG TARGETARCH


# Install build dependencies & ca-certificates
RUN apk add --no-cache git ca-certificates tzdata

# Copy module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary (arsitektur mengikuti platform target).
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH:-amd64} go build \
    -ldflags="-s -w" \
    -o /app/server ./main.go

# Production runtime stage
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates and tzdata for Jakarta timezone support
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy binary from builder
COPY --from=builder /app/server /app/server

EXPOSE 8080

CMD ["/app/server"]
