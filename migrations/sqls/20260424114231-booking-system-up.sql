CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

--  pgcrypto helps in advanced encryption features
--  btree_gist helps inadvanced indexing features

-- ENUMS TYPES 

-- DO $$ BEGIN ... END $$  wraps code in an executable block and EXCEPTION WHEN dup.... is just telling us to ignore error if type already exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('created', 'cancelled', 'rescheduled', 'confirmed', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE provider_day_status AS ENUM ('open', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE idempotency_status AS ENUM ('processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- TABLES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token TEXT,
    verification_token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(180) NOT NULL UNIQUE,
    bio TEXT,
    address TEXT,
    timezone TEXT NOT NULL DEFAULT 'Africa/Ibadan',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);

 
CREATE TABLE IF NOT EXISTS availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    status provider_day_status NOT NULL DEFAULT 'open',
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time < end_time),
    CHECK (
        (break_start IS NULL AND break_end IS NULL)
        OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_start < break_end)
    )
);

ALTER TABLE availability_rules
ADD CONSTRAINT availability_rules_provider_day_unique
UNIQUE (provider_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_availability_rules_provider_day
ON availability_rules(provider_id, day_of_week);

CREATE TABLE IF NOT EXISTS provider_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    block_period TSTZRANGE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (lower(block_period) < upper(block_period))
);

CREATE INDEX IF NOT EXISTS idx_provider_blocks_provider_period
ON provider_blocks USING GIST (provider_id, block_period);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    booking_period TSTZRANGE NOT NULL,
    status booking_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    cancellation_reason TEXT,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (lower(booking_period) < upper(booking_period)),
    CHECK (
        (status <> 'confirmed' OR confirmed_at IS NOT NULL)
        AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
        AND (status <> 'completed' OR completed_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);


CREATE TABLE IF NOT EXISTS booking_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash TEXT NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    response_data JSONB,
    status idempotency_status NOT NULL DEFAULT 'processing',
    locked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_booking_idempotency_keys_user_id
ON booking_idempotency_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_booking_idempotency_keys_expires_at
ON booking_idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type event_type NOT NULL,
    old_status booking_status,
    new_status booking_status,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON booking_events(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'email',
    status notification_status NOT NULL DEFAULT 'pending',
    subject VARCHAR(255),
    message TEXT,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at
ON system_audit_logs(created_at DESC);


-- UPDATED AT TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_service_providers_updated_at ON service_providers;
CREATE TRIGGER trg_service_providers_updated_at
BEFORE UPDATE ON service_providers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_availability_rules_updated_at ON availability_rules;
CREATE TRIGGER trg_availability_rules_updated_at
BEFORE UPDATE ON availability_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_booking_idempotency_keys_updated_at ON booking_idempotency_keys;
CREATE TRIGGER trg_booking_idempotency_keys_updated_at
BEFORE UPDATE ON booking_idempotency_keys
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- OVERLAP PREVENTION


ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_no_overlap;

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING GIST (
    provider_id WITH =,
    booking_period WITH &&
)
WHERE (status IN ('pending', 'confirmed'));

ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS user_no_overlap;

ALTER TABLE bookings
ADD CONSTRAINT user_no_overlap
EXCLUDE USING GIST (
    user_id WITH =,
    booking_period WITH &&
)
WHERE (status IN ('pending', 'confirmed'));

ALTER TABLE provider_blocks
DROP CONSTRAINT IF EXISTS provider_blocks_no_overlap;

ALTER TABLE provider_blocks
ADD CONSTRAINT provider_blocks_no_overlap
EXCLUDE USING GIST (
    provider_id WITH =,
    block_period WITH &&
);


-- BOOKING STATUS TRANSITION RULES


CREATE OR REPLACE FUNCTION enforce_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'Cancelled bookings cannot be reopened';
        END IF;

        IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
            RAISE EXCEPTION 'Completed bookings cannot be changed';
        END IF;

        IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
            RAISE EXCEPTION 'Pending bookings can only move to confirmed or cancelled';
        END IF;

        IF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
            RAISE EXCEPTION 'Confirmed bookings can only move to completed or cancelled';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_booking_status_transition ON bookings;
CREATE TRIGGER trg_enforce_booking_status_transition
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION enforce_booking_status_transition();


-- BOOKING EVENT AUDIT


CREATE OR REPLACE FUNCTION log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO booking_events (
            booking_id,
            actor_user_id,
            event_type,
            old_status,
            new_status,
            event_data,
            created_at
        )
        VALUES (
            NEW.id,
            NULL,
            CASE
                WHEN NEW.status = 'cancelled' THEN 'cancelled'
                WHEN NEW.status = 'confirmed' THEN 'confirmed'
                WHEN NEW.status = 'completed' THEN 'completed'
                ELSE 'created'
            END,
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'updated_at', NOW()
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_booking_status_change ON bookings;
CREATE TRIGGER trg_log_booking_status_change
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_status_change();


-- BOOKING CREATION FUNCTION


CREATE OR REPLACE FUNCTION create_booking(
    p_user_id UUID,
    p_provider_id UUID,
    p_service_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
BEGIN
    IF p_start_at >= p_end_at THEN
        RAISE EXCEPTION 'Invalid booking period';
    END IF;

    INSERT INTO bookings (
        user_id,
        provider_id,
        service_id,
        booking_period,
        status,
        notes
    )
    VALUES (
        p_user_id,
        p_provider_id,
        p_service_id,
        tstzrange(p_start_at, p_end_at, '[)'),
        'pending',
        p_notes
    )
    RETURNING id INTO v_booking_id;

    INSERT INTO booking_events (
        booking_id,
        actor_user_id,
        event_type,
        old_status,
        new_status,
        event_data
    )
    VALUES (
        v_booking_id,
        p_user_id,
        'created',
        NULL,
        'pending',
        jsonb_build_object(
            'provider_id', p_provider_id,
            'service_id', p_service_id,
            'start_at', p_start_at,
            'end_at', p_end_at
        )
    );

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;


-- USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_created
ON bookings(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created
ON bookings(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_period_gist
ON bookings USING GIST (provider_id, booking_period);


-- VIEW
CREATE OR REPLACE VIEW upcoming_bookings AS
SELECT
    b.id,
    b.user_id,
    b.provider_id,
    b.service_id,
    b.booking_period,
    b.status,
    b.created_at
FROM bookings b
WHERE b.status IN ('pending', 'confirmed')
  AND upper(b.booking_period) > NOW();