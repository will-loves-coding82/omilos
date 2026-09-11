package server

import (
	"context"
	"encoding/json"
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
		httpio.BadRequest(w, r, err)
		return
	}

	_, err = h.client.CreateNewEventTx(ctx, event)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, NewEventPayload{Slug: event.Slug})
}
