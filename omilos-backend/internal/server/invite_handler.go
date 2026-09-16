package server

import (
	"errors"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/server/httpio"

	"github.com/clerk/clerk-sdk-go/v2"
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

func (h *InviteHandler) GetPendingInviteCountForUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no session claims in context"))
		return
	}
	clerkId := claims.Subject

	count, err := h.client.GetPendingInviteCountForUser(clerkId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, PendingInviteCountPayload{Count: count})
}

func (h *InviteHandler) GetAllInvitesForUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	if !ok {
		httpio.InternalError(w, r, errors.New("no session claims in context"))
		return
	}
	clerkId := claims.Subject

	invites, err := h.client.GetAllInvitesForUser(clerkId)
	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, InvitesPayload{SentInvites: invites.Sent, PendingInvites: invites.Pending})

}
