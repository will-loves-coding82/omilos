package app

import (
	"context"
	"log"
	"omilos-backend/internal/database"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

var testDB database.Service

func getSqlFiles(dir string) []string {
	files, err := os.ReadDir(dir)
	if err != nil {
		log.Fatalf("failed to read SQL directory %s: %v", dir, err)
	}
	var paths []string
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".sql" {
			paths = append(paths, filepath.Join(dir, f.Name()))
		}
	}
	return paths
}

func mustStartPostgresContainer() (func(context.Context, ...testcontainers.TerminateOption) error, error) {

	os.Setenv("IS_TESTING", "true")

	var (
		dbName = os.Getenv("OMILOS_DB_DATABASE")
		dbPwd  = os.Getenv("OMILOS_DB_PASSWORD")
		dbUser = os.Getenv("OMILOS_DB_USERNAME")
	)

	if len(dbName) == 0 {
		log.Fatal("OMILOS_DB_DATABASE cannot be empty")
	}

	if len(dbPwd) == 0 {
		log.Fatal("OMILOS_DB_PASSWORD cannot be empty")
	}

	if len(dbUser) == 0 {
		log.Fatal("OMILOS_DB_USERNAME cannot be empty")
	}

	initScripts := append(
		getSqlFiles(filepath.Join("..", "..", "sql", "init")),
		getSqlFiles(filepath.Join("..", "..", "sql", "testdata"))...,
	)

	dbContainer, err := postgres.Run(
		context.Background(),
		"postgres:18.6-alpine",
		postgres.WithOrderedInitScripts(initScripts...),
		postgres.WithDatabase(dbName),
		postgres.WithUsername(dbUser),
		postgres.WithPassword(dbPwd),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(2*time.Minute)),
	)
	if err != nil {
		log.Fatal(err)
	}

	dbHost, err := dbContainer.Host(context.Background())
	if err != nil {
		return dbContainer.Terminate, err
	}

	dbPort, err := dbContainer.MappedPort(context.Background(), "5432/tcp")
	if err != nil {
		return dbContainer.Terminate, err
	}

	db := database.NewCustom(dbHost, dbPort.Port())
	testDB = db

	return dbContainer.Terminate, err
}

func TestMain(m *testing.M) {
	teardown, err := mustStartPostgresContainer()
	if err != nil {
		log.Fatalf("could not start postgres container: %v", err)
	}
	m.Run()

	if teardown != nil && teardown(context.Background()) != nil {
		log.Fatalf("could not teardown postgres container: %v", err)
	}
}
