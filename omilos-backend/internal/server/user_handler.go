package server

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"
)

type UserHandler struct {
	client                *app.UserClient
	internalWebhookSecret string
}

// NewUserHandler builds a UserHandler. internalWebhookSecret guards
// CreateNewUser, which is called only by our own Next.js server after IT has
// already verified the request genuinely came from Clerk (via Clerk's own
// Svix-based verifyWebhook helper). Clerk's Svix signature can't be checked
// here directly — this endpoint receives a new, unsigned server-to-server
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

func (p ClerkUserPayload) PrimaryEmail() string {
	if len(p.EmailAddresses) == 0 {
		return ""
	}
	return p.EmailAddresses[0].EmailAddress
}

func (h *UserHandler) CreateNewUser(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	// Verify this internal call actually came from our own Next.js server —
	// Clerk's original webhook signature was already checked there (via
	// Clerk's verifyWebhook), so this endpoint only needs to confirm the
	// caller knows the shared secret, not re-verify a Clerk signature that
	// was never attached to this hop in the first place.
	providedSecret := r.Header.Get("X-Internal-Webhook-Secret")
	if h.internalWebhookSecret == "" || providedSecret == "" ||
		subtle.ConstantTimeCompare([]byte(providedSecret), []byte(h.internalWebhookSecret)) != 1 {
		httpio.Error(w, r, http.StatusUnauthorized, "invalid secret", errors.New("missing or invalid internal webhook secret"))
		return
	}

	var payload ClerkUserPayload
	err = json.Unmarshal(body, &payload)
	if err != nil {
		fmt.Println(err)
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
		fmt.Print(err)
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
		httpio.BadRequest(w, r, errors.New("Search query cannot be empty"))
		return
	}

	users, err := h.client.SearchUsers(searchQuery)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, SearchUsersPayload{Users: users})
}
