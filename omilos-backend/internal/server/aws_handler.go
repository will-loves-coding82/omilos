package server

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"omilos-backend/internal/server/httpio"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type PresignerHandler struct {
	PresignClient *s3.PresignClient
	BucketName    string
}

func NewPresignHandler(client *s3.PresignClient, bucket string) *PresignerHandler {
	return &PresignerHandler{
		PresignClient: client,
		BucketName:    bucket,
	}
}

type PresignedHandlerResponse struct {
	PresignedURL string `json:"presigned_url"`
}

func (h *PresignerHandler) GetPresignedURL(w http.ResponseWriter, r *http.Request) {
	log.Print("Getting presigned URL")
	objectKey := r.URL.Query().Get("file")
	if objectKey == "" {
		httpio.BadRequest(w, r, errors.New("Missing file query parameter"))
		return
	}

	uniqueKey := fmt.Sprintf("%s-%s", uuid.NewString(), objectKey)
	presignedReq, err := h.PresignClient.PresignPutObject(r.Context(), &s3.PutObjectInput{
		Bucket: aws.String(h.BucketName),
		Key:    aws.String("event-images/" + uniqueKey),
	})

	if err != nil {
		log.Print(err)
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, PresignedHandlerResponse{PresignedURL: presignedReq.URL})
}
