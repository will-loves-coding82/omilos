package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"
)

type InviteHandler struct {
	client *app.InviteClient
}

func NewInviteHandler(client *app.InviteClient) *InviteHandler {
	return &InviteHandler{
		client: client,
	}
}

type PendingInviteCountPayload struct {
	Count int64 `json:"count"`
}

type InvitesPayload struct {
	SentInvites    []app.Invite `json:"sent_invites"`
	PendingInvites []app.Invite `json:"pending_invites"`
}

type UpdateInviteBody struct {
	Invite    app.Invite `json:"invite"`
	NewStatus string     `json:"new_status"`
}

func (h *InviteHandler) GetPendingInviteCountForUser(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	count, err := h.client.GetPendingInviteCountForUser(user.Id)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, PendingInviteCountPayload{Count: count})
}

func (h *InviteHandler) GetAllInvitesForUser(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	invites, err := h.client.GetAllInvitesForUser(user.Id)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, InvitesPayload{SentInvites: invites.Sent, PendingInvites: invites.Pending})

}

func (h *InviteHandler) UpdateInviteStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no user in context"))
		return
	}

	var body UpdateInviteBody
	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		httpio.BadRequest(w, r, err)
		return
	}

	switch body.NewStatus {
	case "accepted":
		err = h.client.AcceptInvite(user.Id, body.Invite)
		if err != nil {
			httpio.InternalError(w, r, err)
			return
		}
	case "declined":
		err = h.client.DeclineInvite(user.Id, body.Invite)
		if err != nil {
			httpio.InternalError(w, r, err)
			return
		}
	case "pending":
		err = h.client.ResendInvite(body.Invite)
		if err != nil {
			log.Print(err)
			httpio.InternalError(w, r, err)
			return
		}
	}

	httpio.JSON(w, r, http.StatusAccepted, nil)
}
