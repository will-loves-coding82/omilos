package app

import "omilos-backend/internal/database"

type EventClient struct {
	db         database.Service
	userClient *UserClient
}

type InviteClient struct {
	db         database.Service
	userClient *UserClient
}

type UserClient struct {
	db database.Service
}

func NewEventClient(database database.Service, userClient *UserClient) *EventClient {
	return &EventClient{
		db:         database,
		userClient: userClient,
	}
}

func NewInviteClient(database database.Service, userClient *UserClient) *InviteClient {
	return &InviteClient{
		db:         database,
		userClient: userClient,
	}
}

func NewUserClient(database database.Service) *UserClient {
	return &UserClient{
		db: database,
	}
}
