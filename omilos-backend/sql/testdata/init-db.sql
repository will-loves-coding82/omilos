-- Each test user gets an autoincremented user id
INSERT INTO users(clerk_id, username, first_name, last_name, email, image_url) 
VALUES
  ('clerk_id_1', 'test-aragorn', 'Aragorn', 'Strider', 'astrider@gmail.com', 'placeholder'),
  ('clerk_id_2', 'test-sam', 'Sam', 'Gamgee', 'samgee@gmail.com', 'placeholder'),
  ('clerk_id_3', 'test-frodo', 'Frodo', 'Baggins', 'frodobaggins@gmail.com', 'placeholder'),
  ('clerk_id_4', 'test-gandalf', 'Gandalf', 'The White', 'gandalf@gmail.com', 'placeholder');

INSERT INTO events(host_id, slug, title, image_url, description, date) 
VALUES
  (1, 'event-slug-1', 'Event 1', 'Test description for Event 1', 'placeholder', NOW() + INTERVAL '1 day'),
  (2, 'event-slug-2', 'Event 2', 'Test description for Event 2', 'placeholder', NOW() + INTERVAL '2 days');

INSERT INTO event_members(user_id, event_id, rsvp_status)
VALUES
  (1, 1, 'accepted'),
  (2, 1, 'pending'),
  (3, 1, 'pending'),
  (4, 1, 'accepted');


