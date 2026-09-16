package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/database"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func (s *Server) RegisterRoutes(database database.Service) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	awsCfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatalf("error loading AWS config: %v", err)
	}

	awsS3Client := s3.NewFromConfig(awsCfg)
	awsPresignClient := s3.NewPresignClient(awsS3Client)
	awsPresignHandler := NewPresignHandler(awsPresignClient, os.Getenv("OMILOS_S3_BUCKET"))

	userClient := app.NewUserClient(database)
	eventClient := app.NewEventClient(database, userClient)
	inviteClient := app.NewInviteClient(database, userClient)

	userHandler := NewUserHandler(userClient)
	eventHandler := NewEventHandler(eventClient)
	inviteHandler := NewInviteHandler(inviteClient)

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

	r.Group(func(r chi.Router) {
		r.Use(Middleware)

		r.Get("/users", userHandler.SearchUsers)

		r.Post("/events", eventHandler.CreateNewEvent)
		r.Get("/events", eventHandler.GetEventsForUser)
		r.Get("/events/{slug}/stops", eventHandler.GetEventStops)

		r.Post("/events/{slug}/stops", eventHandler.AddNewEventStop)
		r.Patch("/events/{slug}/stops", eventHandler.ReorderEventStops)
		r.Delete("/events/{slug}/stops/{stopId}", eventHandler.DeleteEventStop)

		r.Get("/invites/pending/count", inviteHandler.GetPendingInviteCountForUser)
		r.Get("/members/invites/all", inviteHandler.GetAllInvitesForUser)

		r.Get("/presign", awsPresignHandler.GetPresignedURL)
	})

	return r
}

func Middleware(next http.Handler) http.Handler {
	return clerkhttp.RequireHeaderAuthorization()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, ok := clerk.SessionClaimsFromContext(r.Context())
		if !ok {
			fmt.Print("middleware failed")
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// claims.Subject is the Clerk user id — already verified and in context
		next.ServeHTTP(w, r)
	}))

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
