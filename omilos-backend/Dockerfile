# Fetch dependencies in their own layer so they're cached separately from source changes
FROM golang:1.27-alpine AS deps
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

# Compile a static binary using the cached modules from the deps stage
FROM golang:1.27-alpine AS builder
WORKDIR /app
COPY --from=deps /go/pkg/mod /go/pkg/mod
COPY . .
RUN CGO_ENABLED=0 go build -o main cmd/api/main.go

# Final runtime image: just the compiled binary, no Go toolchain or source
FROM alpine:3.22 AS runner
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/main .

USER app

EXPOSE 8080

CMD ["./main"]
