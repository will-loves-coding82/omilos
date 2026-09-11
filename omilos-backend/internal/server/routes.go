package server

import (
	"encoding/json"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/database"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func (s *Server) RegisterRoutes(database database.Service) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	userClient := app.NewUserClient(database)
	eventClient := app.NewEventClient(database, userClient)

	userHandler := NewUserHandler(userClient)
	eventHandler := NewEventHandler(eventClient)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/", s.HelloWorldHandler)
	r.Get("/health", s.healthHandler)

	r.Post("/users", userHandler.CreateNewUser)
	r.Get("/users", userHandler.SearchUsers)
	r.Post("/events", eventHandler.CreateNewEvent)
	r.Get("/events", eventHandler.GetEventsForUser)

	return r
}

func (s *Server) HelloWorldHandler(w http.ResponseWriter, r *http.Request) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}

	_, _ = w.Write(jsonResp)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, _ := json.Marshal(s.db.Health())
	_, _ = w.Write(jsonResp)
}
