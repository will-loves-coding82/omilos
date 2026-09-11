package app

import (
	"context"
	"fmt"
	"omilos-backend/internal/database"
	"time"
)

type Event struct {
	Title       string `json:"title" db:"title"` // omitted if empty string
	Description string `json:"description" db:"description"`
	Slug        string `json:"slug" db:"slug"`
	Date        string `json:"date" db:"date"`
	HostId      string `json:"host_id" db:"host_id"`
	Members     []User `json:"members"`
}

type EventClient struct {
	db database.Service
}

func NewEventClient(database database.Service) *EventClient {
	return &EventClient{
		db: database,
	}
}

// CreateNewHangoutTx initializes a new transaction and creates a new
// hangout in the database. A second query in the same transaction
// creates new notifications for the members invited to this event
func (e *EventClient) CreateNewEventTx(ctx context.Context, event Event) (int64, error) {
	tx, err := e.db.Conn().BeginTx(ctx, nil)
	fail := func(err error) (int64, error) {
		return 0, fmt.Errorf("CreateNewEventTx: %v", err)
	}

	if err != nil {
		return fail(err)
	}

	defer tx.Rollback()

	layout := "2006-01-02" // go's unique date format
	parsedDate, err := time.Parse(layout, event.Date)

	_, err = tx.Exec(`INSERT INTO events(title, description, date, hostId) VALUES($1, $2, $3, $4);`, event.Title, event.Description, parsedDate, event.HostId)
	if err != nil {
		return fail(err)
	}

	// TODO: Add event members. Each one has a pending rsvp_status by default
	_, err = tx.Exec(``)

	return 0, nil
}
