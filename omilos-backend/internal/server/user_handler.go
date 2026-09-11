package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"
)

type UserHandler struct {
	client *app.UserClient
}

func NewUserHandler(client *app.UserClient) *UserHandler {
	return &UserHandler{
		client: client,
	}
}

// ClerkUserPayload mirrors the subset of Clerk's user.created webhook
// payload (UserJSON) needed to create a user.
type ClerkUserPayload struct {
	Id             string `json:"id"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
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
	var payload ClerkUserPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		fmt.Println(err)
		httpio.BadRequest(w, r, err)
		return
	}

	user := app.User{
		ClerkId:   payload.Id,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		Email:     payload.PrimaryEmail(),
	}

	err = h.client.CreateNewUser(user)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.NoContent(w, r, http.StatusOK)
}
