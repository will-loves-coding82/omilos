package app

import "omilos-backend/internal/database"

type UserClient struct {
	db *database.Service
}

func NewUserClient(database *database.Service) *UserClient {
	return &UserClient{
		db: database,
	}
}

func (u *UserClient) CreateNewUser() (int64, error) {
	return 0, nil
}
