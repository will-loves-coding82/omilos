package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/logger"
	"omilos-backend/internal/server/httpio"
	"strconv"
	"time"

	"go.uber.org/zap"
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
	user, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	var event app.Event
	err := json.NewDecoder(r.Body).Decode(&event)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(err))
		httpio.BadRequest(w, r, err)
		return
	}

	newSlug, err := h.client.CreateNewEventTx(ctx, user.Id, event)
	if err != nil {
		logger.Events.Error("failed to create event", zap.Int64("userId", user.Id), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, NewEventPayload{Slug: newSlug})
}

func (h *EventHandler) GetEventsForUser(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	events, err := h.client.GetEventsForUser(user.Id)
	if err != nil {
		logger.Events.Error("failed to get events for user", zap.Int64("userId", user.Id), zap.String("path", r.URL.Path), zap.Error(err))
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
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventSlug := r.PathValue("slug")
	if len(eventSlug) == 0 {
		logger.Events.Warn("request validation failed", zap.String("eventSlug", eventSlug), zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, errors.New("slug path parameter is missing"))
		return
	}

	eventId, err := h.client.GetEventIdForSlug(eventSlug)
	if err != nil {
		if errors.Is(err, app.ErrEventNotFound) {
			logger.Events.Warn(app.ErrEventNotFound.Error(),
				zap.String("eventSlug", eventSlug),
				zap.String("path", r.URL.Path),
				zap.Error(ErrResourceNotFound),
			)
			httpio.Error(w, r, http.StatusNotFound, app.ErrEventNotFound.Error(), err)
			return
		}
		logger.Events.Error("failed to get eventId for slug", zap.Int64("eventId", eventId), zap.Int64("userId", user.Id))
		httpio.Error(w, r, http.StatusNotFound, "not found", err)
		return
	}

	isMember, err := h.client.IsEventMember(eventId, user.Id)
	if err != nil {
		logger.Events.Error("failed to check event membership", zap.Int64("eventId", eventId), zap.Int64("userId", user.Id), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	if !isMember {
		logger.Events.Warn("user is not a member in the event",
			zap.Int64("eventId", eventId),
			zap.Int64("userId", user.Id),
			zap.String("path", r.URL.Path),
			zap.Error(ErrResourceNotFound),
		)
		httpio.Error(w, r, http.StatusNotFound, "user is not a member in the event", ErrResourceNotFound)
		return
	}

	event, err := h.client.GetEventDetails(eventId, user.Id)
	if err != nil {
		logger.Events.Error("failed to get event details", zap.Int64("eventId", eventId), zap.Int64("userId", user.Id), zap.String("path", r.URL.Path), zap.Error(err))
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
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	log.Println("Getting eventId")
	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	var stop app.EventStop
	log.Println("Decoding body")
	err = json.NewDecoder(r.Body).Decode(&stop)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	log.Println(stop)
	eventStop := app.EventStop{
		MapboxId:  stop.MapboxId,
		Name:      stop.Name,
		Address:   stop.Address,
		Latitude:  stop.Latitude,
		Longitude: stop.Longitude,
	}

	id, err := h.client.AddEventStop(eventId, eventStop)
	if err != nil {
		logger.Events.Error("failed to add event stop", zap.Int64("eventId", eventId), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusCreated, AddEventStopPayload{Id: id})
}

func (h *EventHandler) ReorderEventStops(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	var reorderedStops []app.EventStop
	err = json.NewDecoder(r.Body).Decode(&reorderedStops)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.ReorderEventStops(eventId, reorderedStops)
	if err != nil {
		logger.Events.Error("failed to reorder events stops", zap.Int64("eventId", eventId), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

type UpdateActiveStopPayload struct {
	StopId int64 `json:"stop_id"`
}

func (h *EventHandler) UpdateActiveStop(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	var payload UpdateActiveStopPayload
	err = json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.UpdateActiveStop(eventId, payload.StopId)
	if err != nil {
		logger.Events.Error("failed to update active stop", zap.Int64("eventId", eventId), zap.Int64("stopId", payload.StopId), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

func (h *EventHandler) DeleteEventStop(w http.ResponseWriter, r *http.Request) {
	_, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	stopId, err := parseStopIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse stopId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.DeleteEventStop(eventId, stopId)
	if err != nil {
		logger.Events.Error("failed to delete event stops", zap.Int64("eventId", eventId), zap.Int64("stopId", stopId), zap.String("path", r.URL.Path), zap.Error(err))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

type UpdateStopMemberStatusPayload struct {
	StopStatus string `json:"stop_status"`
}

func (h *EventHandler) UpdateStopMemberStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		logger.Events.Error("no user in context", zap.String("path", r.URL.Path))
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	stopId, err := parseStopIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse stopId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	var payload UpdateStopMemberStatusPayload
	err = json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	// user.Id comes from the verified session (via UserFromContext), never
	// from the request body — a client can only ever update its own status.
	err = h.client.UpdateStopMemberStatus(eventId, stopId, user.Id, payload.StopStatus)
	if err != nil {
		if errors.Is(err, app.ErrStopNotFound) {
			logger.Events.Warn(app.ErrStopNotFound.Error(),
				zap.Int64("eventId", eventId),
				zap.Int64("stopId", stopId),
				zap.Int64("userId", user.Id),
				zap.String("stopStatus", payload.StopStatus),
				zap.String("path", r.URL.Path),
				zap.Error(ErrResourceNotFound),
			)
			httpio.Error(w, r, http.StatusNotFound, app.ErrStopNotFound.Error(), err)
			return
		}
		logger.Events.Error("failed to update stop member status", zap.Int64("eventId", eventId), zap.Int64("userId", user.Id), zap.String("stopStatus", payload.StopStatus))
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, nil)
}

type UpdateEventMemberRoleBody struct {
	MemberId int64  `json:"member_id"`
	NewRole  string `json:"new_role"`
}

func (h *EventHandler) UpdateEventMemberRole(w http.ResponseWriter, r *http.Request) {
	eventId, err := parseEventIdPathValue(r)
	if err != nil {
		logger.Events.Warn("failed to parse eventId path parameter", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	var body UpdateEventMemberRoleBody
	err = json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		logger.Events.Warn("failed to decode request body", zap.String("path", r.URL.Path), zap.Error(ErrValidationFailed))
		httpio.BadRequest(w, r, err)
		return
	}

	err = h.client.UpdateEventMemberRole(eventId, body.MemberId, body.NewRole)
	if err != nil {
		logger.Events.Error("failed to update member role", zap.Int64("eventId", eventId), zap.Int64("memberId", body.MemberId), zap.String("newRole", body.NewRole))
		httpio.InternalError(w, r, err)
	}

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

func parseStopIdPathValue(r *http.Request) (int64, error) {
	stopId := r.PathValue("stopId")
	if len(stopId) == 0 {
		return 0, errors.New("stopId path parameter is missing")
	}

	id, err := strconv.ParseInt(stopId, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("could not convert stopId path parameter to integer: %v", err)
	}

	return id, nil
}
