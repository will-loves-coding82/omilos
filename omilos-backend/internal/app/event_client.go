package app

import (
	"context"
	"encoding/json"
	"fmt"
	"omilos-backend/internal/database"
	"omilos-backend/internal/slug"
	"time"
)

type Event struct {
	Id          int64   `json:"id" db:"id"`
	Title       string  `json:"title" db:"title"` // omitted if empty string
	Description string  `json:"description" db:"description"`
	Slug        string  `json:"slug" db:"slug"`
	Date        string  `json:"date" db:"date"`
	HostId      string  `json:"host_id" db:"host_id"`
	ImageURL    string  `json:"image_url,omitempty" db:"image_url"`
	MemberIds   []int64 `json:"member_ids,omitempty"` // invitee ids, used only when creating an event
	Members     []User  `json:"members,omitempty"`    // enriched attendees, populated only when reading an event
}

type EventStop struct {
	Id        int64   `json:"id" db:"id"`
	EventId   int64   `json:"event_id" db:"event_id"`
	SortId    int64   `json:"sort_id" db:"sort_id"`
	Name      string  `json:"name" db:"name"`
	Address   string  `json:"address" db:"address"`
	Latitude  float64 `json:"latitude" db:"latitude"`
	Longitude float64 `json:"longitude" db:"longitude"`
}

type EventClient struct {
	db         database.Service
	userClient *UserClient
}

func NewEventClient(database database.Service, userClient *UserClient) *EventClient {
	return &EventClient{
		db:         database,
		userClient: userClient,
	}
}

const getEventIdForSlug = `
	SELECT id
	FROM events
	WHERE slug=$1;
`

const getEventsForUserQuery = `
	SELECT
		e.id, e.slug, e.name AS title, e.description, e.date, e.host_id, e.image_url,
		COALESCE(
			(
				SELECT json_agg(json_build_object(
					'id', u.id,
					'clerk_id', u.clerk_id,
					'first_name', u.first_name,
					'last_name', u.last_name,
					'email', u.email,
					'image_url', u.image_url
				))
				FROM users u
				WHERE u.id = e.host_id
				OR u.id IN (SELECT user_id FROM event_members WHERE event_id = e.id AND rsvp_status = 'accepted')
			),
			'[]'
		) AS members
	FROM events e
	WHERE e.host_id = $1
	OR e.id IN (SELECT event_id FROM event_members WHERE user_id = $1);
`

const getEventStopsQuery = `
	SELECT
		es.id, es.event_id, es.sort_id, es.name, es.address, es.longitude, es.latitude
	FROM event_stops es
	JOIN events e ON es.event_id = e.id
	WHERE e.slug=$1
	ORDER BY es.sort_id ASC;
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

// eventRow mirrors the events table's actual column shape, since Event's
// db tags describe the API/insert shape (host_id as a Clerk string id,
// title vs the name column) rather than what a plain SELECT returns.
type eventRow struct {
	Id          int64           `db:"id"`
	Slug        string          `db:"slug"`
	Title       string          `db:"title"`
	Description *string         `db:"description"`
	Date        time.Time       `db:"date"`
	HostId      int64           `db:"host_id"`
	ImageURL    *string         `db:"image_url"`
	Members     json.RawMessage `db:"members"`
}

func (e *EventClient) GetEventIdForSlug(slug string) (int64, error) {
	var id int64
	err := e.db.Conn().Get(&id, getEventIdForSlug, slug)
	if err != nil {
		return 0, err
	}

	return id, nil
}

func (e *EventClient) GetEventsForUser(clerkId string) ([]Event, error) {
	user, err := e.userClient.GetUserByClerkId(clerkId)
	if err != nil {
		return nil, fmt.Errorf("GetEventsForUser: %v", err)
	}

	rows := []eventRow{}
	if err := e.db.Conn().Select(&rows, getEventsForUserQuery, user.Id); err != nil {
		return nil, fmt.Errorf("GetEventsForUser: %v", err)
	}

	events := make([]Event, 0, len(rows))
	for _, r := range rows {
		event := Event{
			Id:    r.Id,
			Slug:  r.Slug,
			Title: r.Title,
			Date:  r.Date.Format("2006-01-02"),
		}
		if r.Description != nil {
			event.Description = *r.Description
		}
		if r.ImageURL != nil {
			event.ImageURL = *r.ImageURL
		}

		var members []User
		if err := json.Unmarshal(r.Members, &members); err != nil {
			return nil, fmt.Errorf("GetEventsForUser: %v", err)
		}
		event.Members = members

		events = append(events, event)
	}

	return events, nil
}

// CreateNewHangoutTx initializes a new transaction and creates a new
// hangout in the database. A second query in the same transaction
// creates new notifications for the members invited to this event
func (e *EventClient) CreateNewEventTx(ctx context.Context, event Event) (string, error) {
	fail := func(err error) (string, error) {
		return "", fmt.Errorf("CreateNewEventTx: %v", err)
	}

	host, err := e.userClient.GetUserByClerkId(event.HostId)
	if err != nil {
		return fail(err)
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
		`INSERT INTO events(slug, name, description, date, host_id, image_url) VALUES($1, $2, $3, $4, $5, $6) RETURNING id;`,
		newSlug, event.Title, event.Description, parsedDate, host.Id, event.ImageURL,
	).Scan(&eventId)
	if err != nil {
		return fail(err)
	}

	// Add event members. Each one has a pending rsvp_status by default
	for _, memberId := range event.MemberIds {
		_, err = tx.Exec(`INSERT INTO event_members(user_id, event_id) VALUES($1, $2);`, memberId, eventId)
		if err != nil {
			return fail(err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fail(err)
	}

	return newSlug, nil
}

func (e *EventClient) GetEventStops(slug string) ([]EventStop, error) {
	var eventStops []EventStop
	err := e.db.Conn().Select(&eventStops, getEventStopsQuery, slug)
	if err != nil {
		return nil, err
	}

	return eventStops, nil
}

func (e *EventClient) AddEventStop(slug string, stop EventStop) (int64, error) {
	eventId, err := e.GetEventIdForSlug(slug)
	if err != nil {
		return 0, err
	}

	var id int64
	err = e.db.Conn().Get(
		&id, addEventStopQuery,
		eventId, stop.Name, stop.Address, stop.Latitude, stop.Longitude,
	)
	if err != nil {
		return 0, fmt.Errorf("AddEventStop: %v", err)
	}

	return id, nil
}

func (e *EventClient) ReorderEventStops(slug string, reorderedStops []EventStop) error {
	eventId, err := e.GetEventIdForSlug(slug)
	if err != nil {
		return err
	}

	ids := make([]int32, len(reorderedStops))
	sortOrders := make([]int32, len(reorderedStops))
	for i, stop := range reorderedStops {
		ids[i] = int32(stop.Id)
		sortOrders[i] = int32(i)
	}

	_, err = e.db.Conn().Exec(reorderEventStopsQuery, ids, sortOrders, eventId)
	if err != nil {
		return fmt.Errorf("ReorderEventStops: %v", err)
	}

	return nil
}
