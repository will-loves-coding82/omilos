package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"omilos-backend/internal/app"
	"omilos-backend/internal/database"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/casbin/casbin/v2"
	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type contextKey string
type ctxKey string

const userContextKey contextKey = "omilos-user"
const ResourceKey ctxKey = "casbin-resource"

var ErrValidationFailed = errors.New("invalid request payload")
var ErrResourceNotFound = errors.New("resource could not be found")

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

	internalWebhookSecret := os.Getenv("INTERNAL_WEBHOOK_SECRET")
	if internalWebhookSecret == "" {
		log.Fatal("INTERNAL_WEBHOOK_SECRET must be set")
	}

	enforcer, err := app.InitializeEnforcer()
	if err != nil {
		log.Fatalf("error initializing policy enforcer: %v", err)
	}

	userClient := app.NewUserClient(database)
	eventClient := app.NewEventClient(database, userClient)
	inviteClient := app.NewInviteClient(database, userClient)

	userHandler := NewUserHandler(userClient, internalWebhookSecret)
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

	// Users are created when they first authenticate with Clerk
	// This invoked via a webhook
	r.Post("/users", userHandler.CreateNewUser)

	r.Group(func(r chi.Router) {
		r.Use(UserMiddleware(userClient))
		r.Get("/users", userHandler.SearchUsers)

		r.Get("/events", eventHandler.GetEventsForUser)
		r.Post("/events", eventHandler.CreateNewEvent)
		r.Get("/events/details/{slug}", eventHandler.GetEventDetails)

		r.Route("/events/{eventId}", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(WithResource(app.ResourceSubjectEvent))
				r.Use(EventMiddleware(eventClient, enforcer))
				r.Get("/", eventHandler.GetEventDetails)
				r.Get("/members", eventHandler.GetEventMembers)
				r.Patch("/members/role", eventHandler.UpdateEventMemberRole)
			})

			r.Group(func(r chi.Router) {
				r.Use(WithResource(app.ResourceSubjectRole))
				r.Use(EventMiddleware(eventClient, enforcer))
				r.Patch("/roles/{userId}", eventHandler.UpdateEventMemberRole)
			})

			r.Group(func(r chi.Router) {
				r.Group(func(r chi.Router) {
					r.Use(WithResource(app.ResourceSubjectStopStatus))
					r.Use(EventMiddleware(eventClient, enforcer))
					r.Get("/stops", eventHandler.GetEventStops)
					r.Patch("/stops/{stopId}/member-status", eventHandler.UpdateStopMemberStatus)
					r.Get("/stops/{stopId}/statuses", eventHandler.UpdateStopMemberStatus)
				})

				r.Group(func(r chi.Router) {
					r.Use(WithResource(app.ResourceSubjectStop))
					r.Use(EventMiddleware(eventClient, enforcer))
					r.Post("/stops", eventHandler.AddNewEventStop)
					r.Patch("/stops", eventHandler.ReorderEventStops)
					r.Delete("/stops/{stopId}", eventHandler.DeleteEventStop)
					r.Patch("/stops/active", eventHandler.UpdateActiveStop)
				})
			})
		})

		r.Patch("/invites", inviteHandler.UpdateInviteStatus)
		r.Get("/invites/all", inviteHandler.GetAllInvitesForUser)
		r.Get("/invites/pending/count", inviteHandler.GetPendingInviteCountForUser)
		r.Get("/presign", awsPresignHandler.GetPresignedURL)
	})

	return r
}

// WithResource attaches a strict target resource type to the request lifecycle
func WithResource(resource app.ResourceSubject) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), ResourceKey, resource)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserFromContext returns the database user attached to the request context by UserMiddleware.
func UserFromContext(ctx context.Context) (app.User, bool) {
	user, ok := ctx.Value(userContextKey).(app.User)
	return user, ok
}

func UserMiddleware(userClient *app.UserClient) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return clerkhttp.RequireHeaderAuthorization()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := clerk.SessionClaimsFromContext(r.Context())
			if !ok {
				fmt.Print("middleware failed")
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			user, err := userClient.GetUserByClerkId(claims.Subject)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, user)
			log.Println("User is authorized")
			next.ServeHTTP(w, r.WithContext(ctx))
		}))
	}
}

// EventMiddleware performs two crticial checks:
//
// 1. It requires that the authenticated user (attached to context by UserMiddleware,
// which must run before this) is the host or an accepted member of the event named by the
// {eventId} path parameter.
//
// 2. It ensures that the user has the proper permissions to interact with
// an event and its related data such as stops and members
func EventMiddleware(eventClient *app.EventClient, enforcer *casbin.Enforcer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := UserFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			eventId, err := parseEventIdPathValue(r)
			if err != nil {
				log.Println(err)
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}

			// 1. Check event membership
			isMember, err := eventClient.IsEventMember(eventId, user.Id)
			if err != nil {
				log.Println(err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if !isMember {
				log.Println("User is not a member")
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			// 2. Check if member has proper access to the requested resource
			targetResource, ok := r.Context().Value(ResourceKey).(app.ResourceSubject)
			if !ok {
				// Fallback to "Event" context if no sub-resource tag is attached
				targetResource = app.ResourceSubjectEvent
			}

			var action app.ActionVerb
			switch r.Method {
			case http.MethodPost:
				action = app.ActionVerbCreate
			case http.MethodGet:
				action = app.ActionVerbRead
			case http.MethodPut, http.MethodPatch:
				action = app.ActionVerbUpdate
			case http.MethodDelete:
				action = app.ActionVerbDelete
			default:
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}

			memberRole, err := eventClient.GetEventMemberRole(eventId, user.Id)
			if err != nil {
				log.Println(err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}

			allowed, err := enforcer.Enforce(string(memberRole), string(targetResource), string(action))
			if err != nil {
				log.Printf("Casbin enforcement error: %v", err)
				http.Error(w, "internal server error", http.StatusInternalServerError)
				return
			}

			if !allowed {
				fmt.Printf("Insufficient permissions. User cannot %s resource %s\n", action, targetResource)
				http.Error(w, "forbidden: insufficient permissions", http.StatusForbidden)
				return
			}

			log.Println("Member is allowed to proceed")
			next.ServeHTTP(w, r)
		})
	}
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
