# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies & ca-certificates
RUN apk add --no-cache git ca-certificates tzdata

# Copy module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
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
