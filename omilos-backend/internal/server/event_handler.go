package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

type InvitesPayload struct {
	Invites []app.Invite `json:"invites"`
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

	clerkId := r.URL.Query().Get("clerkId")
	if len(clerkId) == 0 {
		httpio.BadRequest(w, r, errors.New("clerkId query param is required"))
		return
	}

	newSlug, err := h.client.CreateNewEventTx(ctx, clerkId, event)
	if err != nil {
		fmt.Print(err)
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, NewEventPayload{Slug: newSlug})
}

func (h *EventHandler) GetEventsForUser(w http.ResponseWriter, r *http.Request) {
	clerkId := r.URL.Query().Get("clerkId")
	if len(clerkId) == 0 {
		httpio.BadRequest(w, r, errors.New("clerkId query param is required"))
		return
	}

	events, err := h.client.GetEventsForUser(clerkId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, EventsForUserPayload{Events: events})
}

func (h *EventHandler) GetInvitesForUser(w http.ResponseWriter, r *http.Request) {
	clerkId := r.URL.Query().Get("clerkId")
	if len(clerkId) == 0 {
		httpio.BadRequest(w, r, errors.New("userId query param is required"))
		return
	}

	invites, err := h.client.GetnvitesForUser(clerkId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, InvitesPayload{Invites: invites})
}

type GetEventStopsPayload struct {
	Stops []app.EventStop `json:"stops"`
}

func (h *EventHandler) GetEventStops(w http.ResponseWriter, r *http.Request) {
	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
		return
	}

	stops, err := h.client.GetEventStops(eventSlug)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, GetEventStopsPayload{Stops: stops})
}

type AddEventStopPayload struct {
	Id int64 `json:"id"`
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

	id, err := h.client.AddEventStop(eventSlug, eventStop)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, AddEventStopPayload{Id: id})
}

func (h *EventHandler) ReorderEventStops(w http.ResponseWriter, r *http.Request) {
	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
		return
	}

	var reorderedStops []app.EventStop
	err := json.NewDecoder(r.Body).Decode(&reorderedStops)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.ReorderEventStops(eventSlug, reorderedStops)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

func (h *EventHandler) DeleteEventStop(w http.ResponseWriter, r *http.Request) {
	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
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

	err = h.client.DeleteEventStop(eventSlug, intStopId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}
