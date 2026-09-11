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
	ImageUrl  string `db:"image_url,omitempty" json:"image_url,omitempty"`
	CreatedAt string `db:"created_at,omitempty" json:"created_at,omitempty"`
	UpdatedAt string `db:"updated_at,omitempty" json:"updated_at,omitempty"`
}

type UserClient struct {
	db database.Service
}

const createNewUserQuery = `
	INSERT INTO users(clerk_id, first_name, last_name, email, image_url)
	VALUES($1, $2, $3, $4, $5);
`

const searchUsersQuery = `
	SELECT id, clerk_id, first_name, last_name, email, image_url
	FROM users
	WHERE first_name % $1 OR last_name % $1 OR email % $1;
`

const getUserByClerkIdQuery = `
	SELECT id, clerk_id, first_name, last_name, email, image_url
	FROM users
	WHERE clerk_id = $1;
`

func NewUserClient(database database.Service) *UserClient {
	return &UserClient{
		db: database,
	}
}

func (u *UserClient) CreateNewUser(user User) error {
	_, err := u.db.Conn().Exec(createNewUserQuery, user.ClerkId, user.FirstName, user.LastName, user.Email, user.ImageUrl)
	if err != nil {
		return err
	}

	return nil
}

func (u *UserClient) SearchUsers(searchQuery string) ([]User, error) {
	users := []User{}
	if err := u.db.Conn().Select(&users, searchUsersQuery, searchQuery); err != nil {
		return nil, err
	}

	return users, nil
}

func (u *UserClient) GetUserByClerkId(clerkId string) (User, error) {
	var user User
	if err := u.db.Conn().Get(&user, getUserByClerkIdQuery, clerkId); err != nil {
		return User{}, err
	}

	return user, nil
}
