package app

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEventsGetEventsForAcceptedUser(t *testing.T) {
	userClient := NewUserClient(testDB)
	eventClient := NewEventClient(testDB, userClient)

	events, err := eventClient.GetEventsForUser(1)
	assert.Equal(t, err, nil)
	assert.Equal(t, 1, len(events), "Expected to get 1 event for user 1. Got %d\n", len(events))
}
