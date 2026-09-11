package server

import (
	"net/http"
	"omilos-backend/internal/app"
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

}
