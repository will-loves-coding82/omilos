package server

import (
	"errors"
	"net/http"
	"omilos-backend/internal/server/httpio"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
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
	objectKey := r.URL.Query().Get("fileName")
	if objectKey == "" {
		httpio.BadRequest(w, r, errors.New("Missing fileName query parameter"))
		return
	}

	presignedReq, err := h.PresignClient.PresignPutObject(r.Context(), &s3.PutObjectInput{
		Bucket: aws.String(h.BucketName),
		Key:    aws.String("event-images/" + objectKey),
	})

	if err != nil {
		httpio.InternalError(w, r, err)
		return
	}

	httpio.JSON(w, r, http.StatusOK, PresignedHandlerResponse{PresignedURL: presignedReq.URL})
}
