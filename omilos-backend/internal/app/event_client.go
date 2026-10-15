package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"omilos-backend/internal/slug"
	"regexp"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// it was requested under.
var (
	ErrEventNotFound          = errors.New("event not found")
	ErrStopNotFound           = errors.New("stop not found")
	ErrStopAlreadyExists      = errors.New("stop already added")
	ErrFractionalIndexTaken   = errors.New("fractional index collision, retry")
	ErrInvalidFractionalIndex = errors.New("invalid fractional index")
	ErrStopLimitReached       = errors.New("stop limit reached")
)

const (
	MaxStopsPerEvent      = 50
	maxFractionalIndexLen = 64

	// Must match the constraint names in the migration
	uniqEventMapboxName     = "event_stops_event_mapbox_uniq"
	uniqEventFractionalName = "event_stops_event_key_uniq"
)

// jittered-fractional-indexing emits base-62 keys (0-9, A-Z, a-z).
var fractionalIndexPattern = regexp.MustCompile(`^[0-9A-Za-z]+$`)

func ValidateFractionalIndex(k string) error {
	if k == "" || len(k) > maxFractionalIndexLen || !fractionalIndexPattern.MatchString(k) {
		return ErrInvalidFractionalIndex
	}
	return nil
}

// IsUniqueViolation reports whether err is a 23505 on the named constraint.
func IsUniqueViolation(err error, constraint string) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505" && pqErr.Constraint == constraint
}

// lockEvent takes the per-event row lock until the transaction ends.
// Call it first in every write transaction.
func lockEvent(ctx context.Context, tx *sqlx.Tx, eventId int64) error {
	var locked int64
	err := tx.GetContext(ctx, &locked, `SELECT id FROM events WHERE id = $1 FOR NO KEY UPDATE`, eventId)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrEventNotFound
	}
	return err
}

// countStops must run after lockEvent so the count is exact.
func countStops(ctx context.Context, tx *sqlx.Tx, eventId int64) (int, error) {
	var n int
	err := tx.GetContext(ctx, &n, `SELECT COUNT(*) FROM event_stops WHERE event_id = $1`, eventId)
	return n, err
}

type Event struct {
	Id           int64         `json:"id" db:"id"`
	Title        string        `json:"title" db:"title"`
	Description  string        `json:"description" db:"description"`
	Slug         string        `json:"slug" db:"slug"`
	Date         string        `json:"date" db:"date"`
	HostId       int64         `json:"host_id" db:"host_id"`
	ActiveStopId int64         `json:"active_stop_id,omitempty" db:"active_stop_id"`
	ImageURL     string        `json:"image_url,omitempty" db:"image_url"`
	MemberIds    []int64       `json:"member_ids" db:"member_ids"`   // Used only when creating an event
	MemberRole   MemberRole    `json:"member_role" db:"member_role"` // The user's role for a specific event
	Members      []EventMember `json:"members"`
}

type EventStop struct {
	Id              int64   `json:"id" db:"id"`
	EventId         int64   `json:"event_id" db:"event_id"`
	FractionalIndex string  `json:"fractional_index" db:"fractional_index"`
	MapboxId        string  `json:"mapbox_id" db:"mapbox_id"`
	Name            string  `json:"name" db:"name"`
	Address         string  `json:"address" db:"address"`
	Latitude        float64 `json:"latitude" db:"latitude"`
	Longitude       float64 `json:"longitude" db:"longitude"`

	// Custom fields for HTTP response payloads
	StopMemberStatusArr JSONSlice[StopMemberStatus] `json:"stop_member_status_arr" db:"stop_member_status_arr"`
}

type RSVPStatus = string

const (
	RSVPStatusPending  RSVPStatus = "pending"
	RSVPStatusAccepted RSVPStatus = "accepted"
	RSVPStatusDeclined RSVPStatus = "declined"
)

type EventMember struct {
	User            User       `json:"user" db:"user"`
	RSVPStatus      RSVPStatus `json:"rsvp_status" db:"rsvp_status"`
	MemberRole      MemberRole `json:"member_role" db:"member_role"`
	StatusUpdatedAt string     `json:"status_updated_at,omitempty" db:"status_updated_at"`
	CreatedAt       string     `json:"created_at" db:"created_at"`
}

type StopStatus string

const (
	NotStarted = "not_started"
	InProgress = "in_progress"
	Arrived    = "arrived"
	NoShow     = "no_show"
)

type StopMemberStatus struct {
	UserId          int64      `json:"user_id" db:"user_id"`
	ClerkId         string     `json:"clerk_id" db:"clerk_id"`
	StopId          int64      `json:"stop_id" db:"stop_id"`
	StopStatus      string     `json:"stop_status" db:"stop_status" tstype:"StopStatus"`
	StatusUpdatedAt StopStatus `json:"status_updated_at" db:"status_updated_at"`
}

const createEventQuery = `
	INSERT INTO events(slug, title, description, date, host_id, image_url) 
	VALUES($1, $2, $3, $4, $5, $6) RETURNING id;
`

const getEventIdForSlugQuery = `
	SELECT id
	FROM events
	WHERE slug=$1;
`

const getEventsForUserQuery = `
	SELECT
		e.id, e.slug, e.title, e.description, e.date, e.host_id, COALESCE(e.active_stop_id, 0) AS active_stop_id, e.image_url,
		COALESCE(
			(
				SELECT json_agg(
					jsonb_build_object(
						'user', json_build_object(
							'id', u.id,
							'clerk_id', u.clerk_id,
							'username', u.username,
							'first_name', u.first_name,
							'last_name', u.last_name,
							'email', u.email,
							'image_url', u.image_url
						)
					)
				)
				FROM users u
				WHERE u.id = e.host_id
				OR u.id IN (SELECT user_id FROM event_members em WHERE event_id = e.id AND em.rsvp_status = 'accepted')
			),'[]' 
		) AS members
	FROM events e
	WHERE e.host_id = $1
	OR e.id IN (SELECT event_id FROM event_members em WHERE em.user_id = $1 AND em.rsvp_status = 'accepted');
`

const getEventDetailsQuery = `
	SELECT
		e.id, e.title, e.description, e.slug, e.date, e.host_id, e.image_url, em.member_role AS member_role,
		COALESCE(e.active_stop_id, 0) AS active_stop_id
	FROM events e
	JOIN event_members em ON e.id = em.event_id
	WHERE em.user_id = $1 AND e.id = $2;
`

const getEventMembersQuery = `
	SELECT 
		em.member_role, em.rsvp_status, em.status_updated_at, em.created_at,
		jsonb_build_object(
			'id', u.id,
			'clerk_id', u.clerk_id,
			'username', u.username,
			'first_name', u.first_name,
			'last_name', u.last_name,
			'email', u.email,
			'image_url', u.image_url
		) AS user
	FROM event_members em
	JOIN users u ON u.id = em.user_id
	WHERE em.event_id = $1
	ORDER BY em.created_at, u.id;
`

const getEventStopsQuery = `
	SELECT es.id, es.event_id, es.fractional_index, es.mapbox_id, es.name, es.address, es.latitude, es.longitude,
	COALESCE((
		SELECT json_agg(jsonb_build_object(
			'user_id', sms.user_id,
			'clerk_id', u.clerk_id,
			'stop_id', sms.stop_id,
			'stop_status', sms.stop_status,
			'status_updated_at', sms.status_updated_at
		))
		FROM stop_member_status sms
		JOIN users u ON u.id = sms.user_id
		WHERE sms.stop_id = es.id
	), '[]') AS stop_member_status_arr
	FROM event_stops es
	WHERE es.event_id = $1
	ORDER BY es.fractional_index COLLATE "C", es.id;
`

const isEventMemberQuery = `
	SELECT EXISTS (
		SELECT 1
		FROM events e
		WHERE e.id = $1
		AND (
			e.host_id = $2
			OR e.id IN (SELECT event_id FROM event_members em WHERE em.user_id = $2 AND em.rsvp_status = 'accepted')
		)
	);
`

const getMemberRoleQuery = `
	SELECT member_role
	FROM event_members
	WHERE event_id=$1
	AND user_id=$2;
`

const updateEventMemberRoleQuery = `
	UPDATE event_members
	SET member_role = $1
	WHERE event_id = $2
	AND user_id = $3;
`

const addEventStopQuery = `
	INSERT INTO event_stops(event_id, fractional_index, mapbox_id, name, address, latitude, longitude)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id, event_id, fractional_index, mapbox_id, name, address, latitude, longitude;
`

const reorderEventStopQuery = `
	UPDATE event_stops
	SET fractional_index = $1
	WHERE event_id = $2 AND id = $3
	RETURNING id, fractional_index;
`

const updateActiveStopQuery = `
	UPDATE events
	SET active_stop_id = $1
	WHERE id = $2
	AND ($1::int IS NULL OR EXISTS (
		SELECT 1 FROM event_stops WHERE id = $1 AND event_id = $2
	));
`

const upsertStopMemberStatusQuery = `
	INSERT INTO stop_member_status(user_id, stop_id, stop_status, status_updated_at)
	SELECT $1, es.id, $3, NOW()
	FROM event_stops es
	WHERE es.id = $2 AND es.event_id = $4
	ON CONFLICT (user_id, stop_id) DO UPDATE SET
		stop_status = EXCLUDED.stop_status,
		status_updated_at = EXCLUDED.status_updated_at;
`

const deleteEventStopQuery = `
		DELETE FROM event_stops
		WHERE id=$1 and event_id=$2;
`

func (e *EventClient) GetEventIdForSlug(slug string) (int64, error) {
	var id int64
	err := e.db.Conn().Get(&id, getEventIdForSlugQuery, slug)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, ErrEventNotFound
		}
		return 0, err
	}

	return id, nil
}

func (e *EventClient) GetEventsForUser(userId int64) ([]Event, error) {
	events := make([]Event, 0)
	if err := e.db.Conn().Select(&events, getEventsForUserQuery, userId); err != nil {
		if err == sql.ErrNoRows {
			return make([]Event, 0), nil
		}
		return nil, fmt.Errorf("GetEventsForUser: %v", err)
	}

	return events, nil
}

func (e *EventClient) GetEventDetails(eventId int64, userId int64) (Event, error) {
	var event Event
	err := e.db.Conn().Get(&event, getEventDetailsQuery, userId, eventId)
	if err != nil {
		if err == sql.ErrNoRows {
			return Event{}, nil
		}
		return Event{}, err
	}

	return event, nil
}

// CreateNewEventTx initializes a new transaction and creates a new
// event in the database. A second query in the same transaction
// creates new notifications for the members invited to this event
func (e *EventClient) CreateNewEventTx(ctx context.Context, hostId int64, event Event) (string, error) {
	newSlug, err := slug.Generate(16)
	if err != nil {
		return "", err
	}

	tx, err := e.db.Conn().BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	parsedDate, err := time.Parse(time.RFC3339, event.Date)
	if err != nil {
		return "", err
	}

	var eventId int64
	err = tx.QueryRow(createEventQuery, newSlug, event.Title, event.Description, parsedDate, hostId, event.ImageURL).Scan(&eventId)
	if err != nil {
		return "", err
	}

	// Add invited event members. Each one has a pending rsvp_status with a 'viewer'
	// role by default and a default status_updated_at value of NOW()
	for _, memberId := range event.MemberIds {
		_, err = tx.Exec(`INSERT INTO event_members(user_id, event_id, member_role) VALUES($1, $2, 'viewer');`, memberId, eventId)
		if err != nil {
			return "", err
		}
	}

	// Add the host to the event members with an accepted RSVP status and a 'host' role
	_, err = tx.Exec(`INSERT INTO event_members (user_id, event_id, rsvp_status, member_role, status_updated_at) VALUES ($1, $2, 'accepted', 'host', NOW());`, hostId, eventId)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return newSlug, nil
}

// IsEventMember reports whether userId is the host of eventId or an accepted member of it.
// This is used as the first step in the event middleware check.
func (e *EventClient) IsEventMember(eventId int64, userId int64) (bool, error) {
	var isMember bool
	err := e.db.Conn().Get(&isMember, isEventMemberQuery, eventId, userId)
	if err != nil {
		return false, err
	}

	return isMember, nil
}

// GetEventMemberRole gets the user's role in a specific event.
// This is used in the second step of the event middleware check.
func (e *EventClient) GetEventMemberRole(eventId int64, userId int64) (MemberRole, error) {
	var role string
	err := e.db.Conn().Get(&role, getMemberRoleQuery, eventId, userId)
	if err != nil {
		return "", err
	}
	return role, nil
}

// UpdateEventMemberRole is a host-only action that enables a host to
// update an existng member's role to to a non-host value.
func (e *EventClient) UpdateEventMemberRole(eventId int64, userId int64, newRole MemberRole) error {
	if newRole == MemberRoleHost {
		return errors.New("Making another member a host is not allowed")
	}
	_, err := e.db.Conn().Exec(updateEventMemberRoleQuery, newRole, eventId, userId)
	if err != nil {
		return err
	}

	return nil
}

func (e *EventClient) GetEventMembers(eventId int64) ([]EventMember, error) {
	members := make([]EventMember, 0)
	err := e.db.Conn().Select(&members, getEventMembersQuery, eventId)
	if err != nil {
		return make([]EventMember, 0), err
	}

	return members, nil
}

func (e *EventClient) GetEventStops(eventId int64) ([]EventStop, error) {
	stops := make([]EventStop, 0)
	err := e.db.Conn().Select(&stops, getEventStopsQuery, eventId)
	if err != nil {
		return make([]EventStop, 0), err
	}

	return stops, nil
}

type AddEventStopResult = EventStop

func (e *EventClient) AddEventStop(ctx context.Context, eventId int64, stop EventStop) (EventStop, error) {
	if err := ValidateFractionalIndex(stop.FractionalIndex); err != nil {
		return EventStop{}, err
	}

	tx, err := e.db.Conn().BeginTxx(ctx, nil)
	if err != nil {
		return EventStop{}, err
	}
	defer tx.Rollback()

	if err := lockEvent(ctx, tx, eventId); err != nil {
		return EventStop{}, err
	}

	n, err := countStops(ctx, tx, eventId)
	if err != nil {
		return EventStop{}, err
	}
	if n >= MaxStopsPerEvent {
		return EventStop{}, ErrStopLimitReached
	}

	var saved EventStop
	err = tx.GetContext(ctx, &saved, addEventStopQuery,
		eventId, stop.FractionalIndex, stop.MapboxId, stop.Name, stop.Address, stop.Latitude, stop.Longitude)

	switch {
	case IsUniqueViolation(err, uniqEventMapboxName):
		return EventStop{}, ErrStopAlreadyExists
	case IsUniqueViolation(err, uniqEventFractionalName):
		return EventStop{}, ErrFractionalIndexTaken
	case err != nil:
		return EventStop{}, err
	}
	return saved, tx.Commit()
}

type ReorderStopResult struct {
	Id              int64  `json:"id" db:"id"`
	FractionalIndex string `json:"fractional_index" db:"fractional_index"`
}

func (e *EventClient) ReorderEventStop(ctx context.Context, eventId, stopId int64, fractionalIndex string) (ReorderStopResult, error) {
	if err := ValidateFractionalIndex(fractionalIndex); err != nil {
		return ReorderStopResult{}, err
	}

	tx, err := e.db.Conn().BeginTxx(ctx, nil)
	if err != nil {
		return ReorderStopResult{}, err
	}
	defer tx.Rollback()

	if err := lockEvent(ctx, tx, eventId); err != nil {
		return ReorderStopResult{}, err
	}

	var out ReorderStopResult
	err = tx.GetContext(ctx, &out, reorderEventStopQuery, fractionalIndex, eventId, stopId)

	switch {
	case errors.Is(err, sql.ErrNoRows):
		return ReorderStopResult{}, ErrStopNotFound
	case IsUniqueViolation(err, uniqEventFractionalName):
		return ReorderStopResult{}, ErrFractionalIndexTaken
	case err != nil:
		return ReorderStopResult{}, err
	}
	return out, tx.Commit()
}

// UpdateActiveStop sets the event's currently active stop. A nil stopId clears it.
func (e *EventClient) UpdateActiveStop(eventId int64, stopId *int64) error {
	_, err := e.db.Conn().Exec(updateActiveStopQuery, stopId, eventId)
	if err != nil {
		return err
	}

	return nil
}

// UpdateStopMemberStatus upserts userId's status for stopId. stopId must
// belong to eventId — if it doesn't, no row is written and ErrStopNotFound
// is returned.
func (e *EventClient) UpdateStopMemberStatus(eventId int64, stopId int64, userId int64, status string) error {
	res, err := e.db.Conn().Exec(upsertStopMemberStatusQuery, userId, stopId, status, eventId)
	if err != nil {
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrStopNotFound
	}

	return nil
}

func (e *EventClient) DeleteEventStop(eventId int64, stopId int64) error {
	_, err := e.db.Conn().Exec(deleteEventStopQuery, stopId, eventId)
	if err != nil {
		return err
	}

	return nil
}

func sameIDSet(current []EventStop, ids []int64) bool {
	if len(current) != len(ids) {
		return false
	}
	have := make(map[int64]struct{}, len(current))
	for _, s := range current {
		have[int64(s.Id)] = struct{}{}
	}
	for _, id := range ids {
		if _, ok := have[id]; !ok {
			return false
		}
		delete(have, id) // catches duplicates in ids
	}
	return len(have) == 0
}
