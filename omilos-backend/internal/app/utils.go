package app

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// JSONSlice lets a []T field scan directly from a json/jsonb column.
type JSONSlice[T any] []T

func (s *JSONSlice[T]) Scan(src any) error {
	if src == nil {
		*s = nil
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("JSONSlice: unsupported Scan type %T", src)
	}
	if len(b) == 0 {
		*s = nil
		return nil
	}
	return json.Unmarshal(b, (*[]T)(s))
}

func (s JSONSlice[T]) Value() (driver.Value, error) {
	return json.Marshal([]T(s))
}
