package app

import (
	"database/sql"
	"fmt"
	"omilos-backend/internal/database"
)

const getPendingInviteCountForUserQuery = `
	SELECT
		COUNT(*) AS count
		FROM events e
		JOIN event_members em ON e.id = em.event_id
		WHERE em.user_id = $1;
`

const getAllInvitesForUserQuery = `
	SELECT
		e.id "event.id", e.slug "event.slug", e.name "event.title", e.description "event.description",
		e.date "event.date", e.host_id::text "event.host_id", e.image_url "event.image_url",
		h.id "user.id", h.clerk_id "user.clerk_id", h.first_name "user.first_name",
		h.last_name "user.last_name", h.email "user.email", h.image_url "user.image_url",
		m.id "event_member.member.id", m.clerk_id "event_member.member.clerk_id",
		m.first_name "event_member.member.first_name", m.last_name "event_member.member.last_name",
		m.email "event_member.member.email", m.image_url "event_member.member.image_url",
		em.rsvp_status "event_member.rsvp_status"
	FROM events e
	JOIN users h ON e.host_id = h.id
	JOIN event_members em ON e.id = em.event_id
	JOIN users m ON em.user_id = m.id
	WHERE em.user_id = $1 OR em.rsvp_status = 'pending';
`

type Invite struct {
	Event       Event       `json:"event" db:"event"`
	HostUser    User        `json:"user" db:"user"`
	EventMember EventMember `json:"event_member" db:"event_member"`
}

type InviteClient struct {
	db         database.Service
	userClient *UserClient
}

func NewInviteClient(database database.Service, userClient *UserClient) *InviteClient {
	return &InviteClient{
		db:         database,
		userClient: userClient,
	}
}

// GetPendingInvitesForUser gets the invites that a user recieved but hasn't accepted
func (m *InviteClient) GetPendingInviteCountForUser(clerkId string) (int64, error) {
	user, err := m.userClient.GetUserByClerkId(clerkId)
	if err != nil {
		return 0, fmt.Errorf("GetInvitesForUser: %v", err)
	}

	var count int64
	if err := m.db.Conn().Get(&count, getPendingInviteCountForUserQuery, user.Id); err != nil {
		if err == sql.ErrNoRows {
			return 0, nil
		}
		return 0, fmt.Errorf("GetPendingInviteCountForUser: %v", err)
	}

	return count, nil
}
