-- Drop tables in reverse order
DROP TABLE IF EXISTS system_audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS booking_events;
DROP TABLE IF EXISTS booking_idempotency_keys;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS provider_blocks;
DROP TABLE IF EXISTS availability_rules;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_providers;
DROP TABLE IF EXISTS users;

-- Drop types
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS booking_status;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS event_type;
DROP TYPE IF EXISTS provider_day_status;
DROP TYPE IF EXISTS idempotency_status;

-- Drop extensions
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS btree_gist;