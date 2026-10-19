package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/logger"
	"omilos-backend/internal/server/httpio"
	"strconv"
	"time"

	"go.uber.org/zap"
)

type UserHandler struct {
	client                *app.UserClient
	internalWebhookSecret string
}

// NewUserHandler builds a UserHandler. internalWebhookSecret guards
// CreateNewUser, which is called only by our own Next.js server after IT has
// already verified the request genuinely came from Clerk (via Clerk's own
// Svix-based verifyWebhook helper). Clerk's Svix signature can't be checked
// here directly — this endpoint receives a new server-to-server
// call from Next.js, not a forwarded copy of the original Clerk webhook — so
// a shared secret is the trust mechanism for this internal hop instead.
func NewUserHandler(client *app.UserClient, internalWebhookSecret string) *UserHandler {
	return &UserHandler{
		client:                client,
		internalWebhookSecret: internalWebhookSecret,
	}
}

// ClerkUserPayload mirrors the subset of Clerk's user.created webhook
// payload (UserJSON) needed to create a user.
type ClerkUserPayload struct {
	Id             string `json:"id"`
	UserName       string `json:"username"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	ImageUrl       string `json:"image_url"`
	EmailAddresses []struct {
		EmailAddress string `json:"email_address"`
	} `json:"email_addresses"`
}

const maxSkew = 5 * time.Minute

func verifySignature(secret, timestamp, signature string, body []byte) bool {
	if secret == "" || timestamp == "" || signature == "" {
		return false
	}

	// reject old or far-future timestamps for replay protection
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	age := time.Since(time.Unix(ts, 0))
	if age > maxSkew || age < -maxSkew {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp + "."))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	// constant-time comparison
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (p ClerkUserPayload) PrimaryEmail() string {
	if len(p.EmailAddresses) == 0 {
		return ""
	}
	return p.EmailAddresses[0].EmailAddress
}

func (h *UserHandler) CreateNewUser(w http.ResponseWriter, r *http.Request) {
	// Enforce a 1MB cap when reading the entire body
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	body, err := io.ReadAll(r.Body)

	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			httpio.Error(w, r, http.StatusRequestEntityTooLarge, "payload too large", err)
			return
		}
		httpio.BadRequest(w, r, err)
		return
	}

	if !verifySignature(
		h.internalWebhookSecret,
		r.Header.Get("X-Webhook-Timestamp"),
		r.Header.Get("X-Webhook-Signature"),
		body,
	) {
		httpio.Error(w, r, http.StatusUnauthorized, "invalid signature",
			errors.New("invalid or expired webhook signature"))
		return
	}

	var payload ClerkUserPayload
	err = json.Unmarshal(body, &payload)
	if err != nil {
		logger.Users.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	newUser := app.User{
		ClerkId:   payload.Id,
		UserName:  payload.UserName,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Email:     payload.PrimaryEmail(),
		ImageUrl:  payload.ImageUrl,
	}

	err = h.client.CreateNewUser(newUser)
	if err != nil {
		logger.Users.Error("failed to create new user", zap.String("clerkId", payload.Id), zap.String("email", payload.PrimaryEmail()), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.NoContent(w, r, http.StatusOK)
}

type SearchUsersPayload struct {
	Users []app.User `json:"users"`
}

func (h *UserHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	searchQuery := r.URL.Query().Get("search")
	if len(searchQuery) == 0 {
		logger.Users.Warn("search query param cannot be empty", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, errors.New("search query param cannot be empty"))
		return
	}

	users, err := h.client.SearchUsers(searchQuery)
	if err != nil {
		logger.Users.Error("failed to search for users", zap.String("searchQuery", searchQuery), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, SearchUsersPayload{Users: users})
}
