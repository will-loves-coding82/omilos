package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"
	"time"
)

type EventHandler struct {
	client *app.EventClient
}

func NewEventHandler(client *app.EventClient) *EventHandler {
	return &EventHandler{
		client: client,
	}
}

type NewEventPayload struct {
	Slug string `json:"slug"`
}

func (h *EventHandler) CreateNewEvent(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	var event app.Event
	err := json.NewDecoder(r.Body).Decode(&event)
	if err != nil {
		fmt.Print(err)
		httpio.BadRequest(w, r, err)
		return
	}

	newSlug, err := h.client.CreateNewEventTx(ctx, event)
	if err != nil {
		fmt.Print(err)
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, NewEventPayload{Slug: newSlug})
}

type GetEventsForUserPayload struct {
	Events []app.Event `json:"events"`
}

func (h *EventHandler) GetEventsForUser(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("userId")
	if len(userId) == 0 {
		httpio.BadRequest(w, r, errors.New("userId query param is required"))
		return
	}

	events, err := h.client.GetEventsForUser(userId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, GetEventsForUserPayload{Events: events})
}
