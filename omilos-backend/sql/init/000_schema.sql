CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(255) NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL,
  host_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_host_id FOREIGN KEY(host_id) REFERENCES users(id)
);

CREATE TABLE event_stops (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  start_time TIMESTAMPTZ, 
  end_time TIMESTAMPTZ,
  CONSTRAINT fk_event_id FOREIGN KEY(event_id) REFERENCES events(id)
);

CREATE TYPE e_rsvp_status 
AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE event_members (
  user_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  rsvp_status e_rsvp_status DEFAULT 'pending' NOT NULL,
  status_updated_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, event_id),
  CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id),
  CONSTRAINT fk_event_id FOREIGN KEY(event_id) REFERENCES events(id)
);

CREATE TYPE e_stop_status
AS ENUM ('not_started', 'on_the_way', 'arrived', 'no_show');

CREATE TABLE stop_member_status (
  user_id INTEGER NOT NULL,
  stop_id INTEGER NOT NULL,
  stop_status e_stop_status DEFAULT 'not_started' NOT NULL,
  status_updated_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, stop_id),
  CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id),
  CONSTRAINT fk_stop_id FOREIGN KEY(stop_id) REFERENCES event_stops(id)
);

create table event_notifications (
  id bigserial PRIMARY KEY,
  event_id BIGINT REFERENCES events(id),
  stop_id INTEGER REFERENCES event_stops(id),
  actor_id INTEGER references users(id) NOT NULL,
  type TEXT NOT NULL,
  new_status e_stop_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
