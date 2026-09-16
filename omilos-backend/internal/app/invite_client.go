package app

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"omilos-backend/internal/database"
)

const getPendingInviteCountForUserQuery = `
	SELECT
		COUNT(*) AS count
		FROM events e
		JOIN event_members em ON e.id = em.event_id
		WHERE em.user_id = $1 AND em.rsvp_status = 'pending';
`

const getAllInvitesForUserQuery = `
	SELECT
		COALESCE(jsonb_agg(invite.obj) FILTER (WHERE invite.is_pending), '[]') AS pending,
		COALESCE(jsonb_agg(invite.obj) FILTER (WHERE invite.is_sent), '[]') AS sent
	FROM (
		SELECT
			em.user_id = $1 AND em.rsvp_status = 'pending' AS is_pending,
			e.host_id = $1 AND em.user_id != $1 AND em.rsvp_status = 'pending' AS is_sent,
			jsonb_build_object(
				'event', jsonb_build_object(
					'id', e.id,
					'slug', e.slug,
					'title', e.name,
					'description', e.description,
					'date', e.date,
					'host_id', e.host_id,
					'image_url', e.image_url
				),
				'host_user', jsonb_build_object(
					'id', h.id,
					'clerk_id', h.clerk_id,
					'first_name', h.first_name,
					'last_name', h.last_name,
					'email', h.email,
					'image_url', h.image_url
				),
				'event_member', jsonb_build_object(
					'member', jsonb_build_object(
						'id', m.id,
						'clerk_id', m.clerk_id,
						'first_name', m.first_name,
						'last_name', m.last_name,
						'email', m.email,
						'image_url', m.image_url
					),
					'rsvp_status', em.rsvp_status
				)
			) AS obj
		FROM events e
		JOIN users h ON e.host_id = h.id
		JOIN event_members em ON e.id = em.event_id
		JOIN users m ON em.user_id = m.id
		WHERE em.user_id = $1 OR e.host_id = $1
	) invite;
`

type Invite struct {
	Event       Event       `json:"event" db:"event"`
	HostUser    User        `json:"host_user" db:"host_user"`
	EventMember EventMember `json:"event_member" db:"event_member"`
}

// InviteLists separates a user's invites into ones they've received (pending on them
// to RSVP) and ones they've sent (as the host of the event).
type InviteLists struct {
	Pending []Invite `json:"pending"`
	Sent    []Invite `json:"sent"`
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

func (m *InviteClient) GetAllInvitesForUser(clerkId string) (InviteLists, error) {
	user, err := m.userClient.GetUserByClerkId(clerkId)
	if err != nil {
		return InviteLists{}, fmt.Errorf("GetAllInvitesForUser: %v", err)
	}

	var pending, sent []byte
	row := m.db.Conn().QueryRow(getAllInvitesForUserQuery, user.Id)
	if err := row.Scan(&pending, &sent); err != nil {
		return InviteLists{}, fmt.Errorf("GetAllInvitesForUser: %v", err)
	}

	lists := InviteLists{
		Pending: make([]Invite, 0),
		Sent:    make([]Invite, 0),
	}
	if err := json.Unmarshal(pending, &lists.Pending); err != nil {
		return InviteLists{}, fmt.Errorf("GetAllInvitesForUser: %v", err)
	}
	if err := json.Unmarshal(sent, &lists.Sent); err != nil {
		return InviteLists{}, fmt.Errorf("GetAllInvitesForUser: %v", err)
	}

	return lists, nil
}
