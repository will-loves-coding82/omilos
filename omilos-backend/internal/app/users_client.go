package app

import (
	"omilos-backend/internal/database"
)

type User struct {
	Id        int64  `db:"id" json:"id"`
	ClerkId   string `db:"clerk_id" json:"clerk_id"`
	FirstName string `db:"first_name" json:"first_name"`
	LastName  string `db:"last_name,omitempty" json:"last_name,omitempty"`
	Email     string `db:"email,omitempty" json:"email,omitempty"`
	CreatedAt string `db:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt string `db:"updated_at,omitempty" json:"updated_at,omitempty"`
}

type UserClient struct {
	db database.Service
}

const createNewUserQuery = `
	INSERT INTO users(clerk_id, first_name, last_name, email)
	VALUES($1, $2, $3, $4);
`

func NewUserClient(database database.Service) *UserClient {
	return &UserClient{
		db: database,
	}
}

func (u *UserClient) CreateNewUser(user User) error {
	_, err := u.db.Conn().Exec(createNewUserQuery, user.ClerkId, user.FirstName, user.LastName, user.Email)
	if err != nil {
		return err
	}

	return nil
}
