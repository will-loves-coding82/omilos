package app

import (
	"context"
	"database/sql"
	"fmt"
	"omilos-backend/internal/slug"
	"time"
)

type Event struct {
	Id           int64                  `json:"id" db:"id"`
	Title        string                 `json:"title" db:"title"`
	Description  string                 `json:"description" db:"description"`
	Slug         string                 `json:"slug" db:"slug"`
	Date         string                 `json:"date" db:"date"`
	HostId       int64                  `json:"host_id" db:"host_id"`
	ActiveStopId int64                  `json:"active_stop_id,omitempty" db:"active_stop_id"`
	ImageURL     string                 `json:"image_url,omitempty" db:"image_url"`
	MemberIds    []int64                `json:"member_ids,omitempty" db:"member_ids"` // used only when creating an event
	Members      JSONSlice[EventMember] `json:"members,omitempty" db:"members"`       // enriched attendees, populated only when reading an event
	Stops        JSONSlice[EventStop]   `json:"stops,omitempty" db:"stops"`
}

type EventStop struct {
	Id                  int64                       `json:"id" db:"id"`
	EventId             int64                       `json:"event_id" db:"event_id"`
	SortId              int64                       `json:"sort_id" db:"sort_id"`
	Name                string                      `json:"name" db:"name"`
	Address             string                      `json:"address" db:"address"`
	Latitude            float64                     `json:"latitude" db:"latitude"`
	Longitude           float64                     `json:"longitude" db:"longitude"`
	StopMemberStatusArr JSONSlice[StopMemberStatus] `json:"stop_member_status_arr,omitempty" db:"stop_member_status_arr"`
}

//tygo:emit export type RSVPStatus = "pending" | "accepted" | "declined"
type EventMember struct {
	User            User   `json:"user" db:"user"`
	RSVPStatus      string `json:"rsvp_status" db:"rsvp_status" tstype:"RSVPStatus"`
	StatusUpdatedAt string `json:"status_updated_at,omitempty" db:"status_updated_at"`
	CreatedAt       string `json:"created_at" db:"created_at"`
}

//tygo:emit export type StopStatus = "not_started" | "on_the_way" | "arrived" | "no_show"
type StopMemberStatus struct {
	UserId          int64  `json:"user_id" db:"user_id"`
	StopId          int64  `json:"stop_id" db:"stop_id"`
	StopStatus      string `json:"stop_status" db:"stop_status" tstype:"StopStatus"`
	StatusUpdatedAt string `json:"status_updated_at" db:"status_updated_at"`
}

const getEventIdForSlug = `
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
		e.id, e.title, e.description, e.slug, e.date, e.host_id, COALESCE(e.active_stop_id, 0) AS active_stop_id, e.image_url,
		COALESCE(
			(
				SELECT json_agg(
					jsonb_build_object(
						'user', jsonb_build_object(
							'id', u.id,
							'clerk_id', u.clerk_id,
							'username', u.username,
							'first_name', u.first_name,
							'last_name', u.last_name,
							'email', u.email,
							'image_url', u.image_url
						),
						'rsvp_status', em.rsvp_status,
						'status_updated_at', em.status_updated_at,
						'created_at', em.created_at
					)
				)
				FROM users u
				LEFT JOIN event_members em ON u.id = em.user_id AND em.event_id = e.id
				WHERE em.event_id = e.id
			), '[]'
		) AS members,
		COALESCE(
			(
				SELECT json_agg(
					jsonb_build_object(
						'id', es.id,
						'event_id', es.event_id,
						'sort_id', es.sort_id,
						'name', es.name,
						'address', es.address,
						'latitude', es.latitude,
						'longitude', es.longitude,
						'stop_member_status_arr', COALESCE(
							(
								SELECT json_agg(
									jsonb_build_object(
										'user_id', sms.user_id,
										'stop_id', sms.stop_id,
										'stop_status', sms.stop_status,
										'status_updated_at', sms.status_updated_at
									)
								)
								FROM stop_member_status sms
								WHERE sms.stop_id = es.id
							), '[]'
						)
					)
					ORDER BY es.sort_id ASC
				)
				FROM event_stops es
				WHERE es.event_id = e.id
			), '[]'
		) AS stops
	FROM events e
	WHERE e.slug = $1;
`

const addEventStopQuery = `
	INSERT INTO event_stops(event_id, sort_id, name, address, latitude, longitude)
	VALUES (
		$1,
		COALESCE((SELECT MAX(sort_id) + 1 FROM event_stops WHERE event_id = $1), 0),
		$2, $3, $4, $5
	)
	RETURNING id;
`

const reorderEventStopsQuery = `
	UPDATE event_stops AS es
	SET sort_id = data.sort_id
	FROM (
		SELECT * FROM unnest($1::int[], $2::int[]) AS t(id, sort_id)
	) AS data
	WHERE es.id = data.id AND es.event_id = $3;
`

const deleteEventStopQuery = `
		DELETE FROM event_stops
		WHERE id=$1 and event_id=$2;
`

const updateActiveStopQuery = `
	UPDATE events
	SET active_stop_id = $1
	WHERE id = $2;
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

func (e *EventClient) GetEventIdForSlug(slug string) (int64, error) {
	var id int64
	err := e.db.Conn().Get(&id, getEventIdForSlug, slug)
	if err != nil {
		return 0, err
	}

	return id, nil
}

// IsEventMember reports whether userId is the host of eventId or an accepted member of it.
func (e *EventClient) IsEventMember(eventId int64, userId int64) (bool, error) {
	var isMember bool
	err := e.db.Conn().Get(&isMember, isEventMemberQuery, eventId, userId)
	if err != nil {
		return false, fmt.Errorf("IsEventMember: %v", err)
	}

	return isMember, nil
}

func (e *EventClient) GetEventsForUser(userId int64) ([]Event, error) {
	events := []Event{}
	if err := e.db.Conn().Select(&events, getEventsForUserQuery, userId); err != nil {
		if err == sql.ErrNoRows {
			return make([]Event, 0), nil
		}
		return nil, fmt.Errorf("GetEventsForUser: %v", err)
	}

	return events, nil
}

func (e *EventClient) GetEventDetails(slug string) (Event, error) {
	var event Event
	err := e.db.Conn().Get(&event, getEventDetailsQuery, slug)
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
	fail := func(err error) (string, error) {
		return "", fmt.Errorf("CreateNewEventTx: %v", err)
	}

	newSlug, err := slug.Generate(16)
	if err != nil {
		return fail(err)
	}

	tx, err := e.db.Conn().BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	defer tx.Rollback()

	parsedDate, err := time.Parse(time.RFC3339, event.Date)
	if err != nil {
		return fail(err)
	}

	var eventId int64
	err = tx.QueryRow(
		`INSERT INTO events(slug, title, description, date, host_id, image_url) VALUES($1, $2, $3, $4, $5, $6) RETURNING id;`,
		newSlug, event.Title, event.Description, parsedDate, hostId, event.ImageURL,
	).Scan(&eventId)
	if err != nil {
		return fail(err)
	}

	// Add invited event members. Each one has a pending rsvp_status by
	// default and a default status_updated_at value of NOW()
	for _, memberId := range event.MemberIds {
		_, err = tx.Exec(`INSERT INTO event_members(user_id, event_id) VALUES($1, $2);`, memberId, eventId)
		if err != nil {
			return fail(err)
		}
	}

	// Add the host to the event members with a default value of accepted
	_, err = tx.Exec(`INSERT INTO event_members (user_id, event_id, rsvp_status, status_updated_at) VALUES ($1, $2, 'accepted', NOW());`, hostId, eventId)
	if err != nil {
		return fail(err)
	}

	if err := tx.Commit(); err != nil {
		return fail(err)
	}

	return newSlug, nil
}

func (e *EventClient) AddEventStop(eventId int64, stop EventStop) (int64, error) {
	var id int64
	err := e.db.Conn().Get(
		&id, addEventStopQuery,
		eventId, stop.Name, stop.Address, stop.Latitude, stop.Longitude,
	)
	if err != nil {
		return 0, fmt.Errorf("AddEventStop: %v", err)
	}

	return id, nil
}

func (e *EventClient) ReorderEventStops(eventId int64, reorderedStops []EventStop) error {
	ids := make([]int32, len(reorderedStops))
	sortOrders := make([]int32, len(reorderedStops))
	for i, stop := range reorderedStops {
		ids[i] = int32(stop.Id)
		sortOrders[i] = int32(i)
	}

	_, err := e.db.Conn().Exec(reorderEventStopsQuery, ids, sortOrders, eventId)
	if err != nil {
		return fmt.Errorf("ReorderEventStops: %v", err)
	}

	return nil
}

// UpdateActiveStop sets the event's currently active stop. A nil stopId clears it.
func (e *EventClient) UpdateActiveStop(eventId int64, stopId *int64) error {
	_, err := e.db.Conn().Exec(updateActiveStopQuery, stopId, eventId)
	if err != nil {
		return fmt.Errorf("UpdateActiveStop: %v", err)
	}

	return nil
}

func (e *EventClient) DeleteEventStop(eventId int64, stopId int64) error {
	_, err := e.db.Conn().Exec(deleteEventStopQuery, stopId, eventId)
	if err != nil {
		return fmt.Errorf("DeleteEventStop: %v", err)
	}

	return nil
}
