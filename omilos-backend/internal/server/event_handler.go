package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"
	"strconv"
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

	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	newSlug, err := h.client.CreateNewEventTx(ctx, user.Id, event)
	if err != nil {
		fmt.Print(err)
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, NewEventPayload{Slug: newSlug})
}

func (h *EventHandler) GetEventsForUser(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	events, err := h.client.GetEventsForUser(user.Id)
	if err != nil {
		log.Print(err)
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, EventsForUserPayload{Events: events})
}

type GetEventPayload struct {
	Event app.Event `json:"event"`
}

func (h *EventHandler) GetEventDetails(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
		return
	}

	eventId, err := h.client.GetEventIdForSlug(eventSlug)
	if err != nil {
		httpio.Error(w, r, http.StatusNotFound, "not found", errors.New("event not found"))
		return
	}

	isMember, err := h.client.IsEventMember(eventId, user.Id)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}
	if !isMember {
		httpio.Error(w, r, http.StatusNotFound, "not found", errors.New("event not found"))
		return
	}

	event, err := h.client.GetEventDetails(eventSlug)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, GetEventPayload{Event: event})
}

type AddEventStopPayload struct {
	Id int64 `json:"id"`
}

func (h *EventHandler) AddNewEventStop(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	var stop app.EventStop
	err = json.NewDecoder(r.Body).Decode(&stop)
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

	id, err := h.client.AddEventStop(eventId, eventStop)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, AddEventStopPayload{Id: id})
}

func (h *EventHandler) ReorderEventStops(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	var reorderedStops []app.EventStop
	err = json.NewDecoder(r.Body).Decode(&reorderedStops)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.ReorderEventStops(eventId, reorderedStops)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

type UpdateActiveStopPayload struct {
	StopId *int64 `json:"stop_id"`
}

func (h *EventHandler) UpdateActiveStop(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	var payload UpdateActiveStopPayload
	err = json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.UpdateActiveStop(eventId, payload.StopId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

func (h *EventHandler) DeleteEventStop(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	stopId := r.PathValue("stopId")
	if len(stopId) == 0 {
		httpio.BadRequest(w, r, errors.New("stop path parameter is missing"))
	}

	intStopId, err := strconv.ParseInt(stopId, 10, 64)
	if err != nil {
		httpio.InternalError(w, r, fmt.Errorf("Could not convert stopId path parameter to integer: %v", err))
		return
	}

	err = h.client.DeleteEventStop(eventId, intStopId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

func parseEventIdPathValue(r *http.Request) (int64, error) {
	eventId := r.PathValue("eventId")
	if len(eventId) == 0 {
		return 0, errors.New("eventId path parameter is missing")
	}

	id, err := strconv.ParseInt(eventId, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("could not convert eventId path parameter to integer: %v", err)
	}

	return id, nil
}
