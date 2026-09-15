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

type EventsForUserPayload struct {
	Events []app.Event `json:"events"`
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

	httpio.JSON(w, r, http.StatusOK, EventsForUserPayload{Events: events})
}

func (h *EventHandler) GetEventStops(w http.ResponseWriter, r *http.Request) {
	eventId := r.URL.Query().Get("eventId")
	if len(eventId) == 0 {
		httpio.BadRequest(w, r, errors.New("eventId query"))
	}
}

func (h *EventHandler) AddNewEventStop(w http.ResponseWriter, r *http.Request) {
	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
	}

	var stop app.EventStop
	err := json.NewDecoder(r.Body).Decode(&stop)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	eventStop := app.EventStop{
		SortId:    stop.SortId,
		Name:      stop.Name,
		Address:   stop.Address,
		Latitude:  stop.Latitude,
		Longitude: stop.Longitude,
	}

	err = h.client.AddEventStop(eventSlug, eventStop)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, nil)
}

func (h *EventHandler) ReorderEventStops(w http.ResponseWriter, r *http.Request) {
	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
		return
	}

	var reoderedStops []app.EventStop
	err := json.NewDecoder(r.Body).Decode(&reoderedStops)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

}
