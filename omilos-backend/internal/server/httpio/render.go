package httpio

import (
	"net/http"

	"github.com/go-chi/render"
)

// Payload wraps response data so it satisfies render.Renderer.
type Payload struct {
	HTTPStatusCode int `json:"-"`
	Data           any `json:"data,omitempty"`
}

func (p *Payload) Render(w http.ResponseWriter, r *http.Request) error {
	render.Status(r, p.HTTPStatusCode)
	return nil
}

// JSON writes data as a JSON response with the given status code.
func JSON(w http.ResponseWriter, r *http.Request, status int, data any) {
	render.Render(w, r, &Payload{HTTPStatusCode: status, Data: data})
}

// NoContent writes a response with the given status code and no body.
func NoContent(w http.ResponseWriter, r *http.Request, status int) {
	w.WriteHeader(status)
}

// ErrResponse is a reusable error payload for render.Renderer.
type ErrResponse struct {
	HTTPStatusCode int `json:"-"`

	StatusText string `json:"status"`
	ErrorText  string `json:"error,omitempty"`
}

func (e *ErrResponse) Render(w http.ResponseWriter, r *http.Request) error {
	render.Status(r, e.HTTPStatusCode)
	return nil
}

// Error writes an error response with the given status code and message.
func Error(w http.ResponseWriter, r *http.Request, status int, statusText string, err error) {
	resp := &ErrResponse{
		HTTPStatusCode: status,
		StatusText:     statusText,
	}
	if err != nil {
		resp.ErrorText = err.Error()
	}
	render.Render(w, r, resp)
}

// BadRequest writes a 400 response with the given error.
func BadRequest(w http.ResponseWriter, r *http.Request, err error) {
	Error(w, r, http.StatusBadRequest, "invalid request", err)
}

// InternalError writes a 500 response with the given error.
func InternalError(w http.ResponseWriter, r *http.Request, err error) {
	Error(w, r, http.StatusInternalServerError, "internal server error", err)
}
