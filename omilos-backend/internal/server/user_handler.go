package server

import (
	"encoding/json"
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

func (h *UserHandler) CreateNewUser(w http.ResponseWriter, r *http.Request) {
	var user app.User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.CreateNewUser(user)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.NoContent(w, r, http.StatusOK)
}
