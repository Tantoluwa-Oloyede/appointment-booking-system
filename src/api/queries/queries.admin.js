export default {

    getAllUsers: `
        SELECT
            id,
            full_name,
            email,
            phone,
            role,
            is_verified,
            is_active,
            created_at
        FROM users
        WHERE
            ($1::text IS NULL OR role::text = $1)
            AND ($2::text IS NULL OR is_active = $2::boolean)
            AND (
                $3::text IS NULL OR
                full_name ILIKE '%' || $3 || '%' OR
                email ILIKE '%' || $3 || '%'
            )
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
    `,

    countAllUsers: `
        SELECT COUNT(*) as total
        FROM users
        WHERE
            ($1::text IS NULL OR role::text = $1)
            AND ($2::text IS NULL OR is_active = $2::boolean)
            AND (
                $3::text IS NULL OR
                full_name ILIKE '%' || $3 || '%' OR
                email ILIKE '%' || $3 || '%'
            )
    `,

    getUserById: `
        SELECT
            id,
            full_name,
            email,
            phone,
            role,
            is_verified,
            is_active,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
    `,

    suspendUser: `
        UPDATE users
        SET is_active = FALSE
        WHERE id = $1
        AND role != 'admin'
        RETURNING id, full_name, email, role, is_active
    `,

    activateUser: `
        UPDATE users
        SET is_active = TRUE
        WHERE id = $1
        RETURNING id, full_name, email, role, is_active
    `,

    makeAdmin: `
        UPDATE users
        SET role = 'admin'
        WHERE id = $1
        AND role != 'admin'
        RETURNING id, full_name, email, role
    `,

    getAllProviders: `
        SELECT
            sp.id,
            sp.business_name,
            sp.bio,
            sp.address,
            sp.timezone,
            sp.is_verified,
            sp.created_at,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.phone,
            u.is_active
        FROM service_providers sp
        JOIN users u ON u.id = sp.user_id
        WHERE (
            $1::text IS NULL OR
            sp.business_name ILIKE '%' || $1 || '%'
        )
        ORDER BY sp.created_at DESC
        LIMIT $2 OFFSET $3
    `,

    countAllProviders: `
        SELECT COUNT(*) as total
        FROM service_providers sp
        WHERE (
            $1::text IS NULL OR
            sp.business_name ILIKE '%' || $1 || '%'
        )
    `,

    getProviderById: `
        SELECT
            sp.id,
            sp.business_name,
            sp.bio,
            sp.address,
            sp.timezone,
            sp.is_verified,
            sp.created_at,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.phone,
            u.is_active,
            COUNT(s.id) AS total_services,
            COUNT(b.id) AS total_bookings
        FROM service_providers sp
        JOIN users u ON u.id = sp.user_id
        LEFT JOIN services s ON s.provider_id = sp.id
        LEFT JOIN bookings b ON b.provider_id = sp.id
        WHERE sp.id = $1
        GROUP BY sp.id, u.id
    `,

    getAllBookings: `
        SELECT
            b.id,
            b.booking_period,
            b.status,
            b.notes,
            b.cancellation_reason,
            b.confirmed_at,
            b.cancelled_at,
            b.completed_at,
            b.created_at,
            u.full_name AS customer_name,
            u.email AS customer_email,
            s.name AS service_name,
            s.price,
            sp.business_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN services s ON s.id = b.service_id
        JOIN service_providers sp ON sp.id = b.provider_id
        WHERE
            ($1::text IS NULL OR b.status::text = $1)
            AND ($2::uuid IS NULL OR b.provider_id = $2::uuid)
            AND ($3::uuid IS NULL OR b.user_id = $3::uuid)
            AND ($4::timestamptz IS NULL OR lower(b.booking_period) >= $4::timestamptz)
            AND ($5::timestamptz IS NULL OR upper(b.booking_period) <= $5::timestamptz)
        ORDER BY b.created_at DESC
        LIMIT $6 OFFSET $7
    `,

    countAllBookings: `
        SELECT COUNT(*) as total
        FROM bookings b
        WHERE
            ($1::text IS NULL OR b.status::text = $1)
            AND ($2::uuid IS NULL OR b.provider_id = $2::uuid)
            AND ($3::uuid IS NULL OR b.user_id = $3::uuid)
            AND ($4::timestamptz IS NULL OR lower(b.booking_period) >= $4::timestamptz)
            AND ($5::timestamptz IS NULL OR upper(b.booking_period) <= $5::timestamptz)
    `,

    getBookingById: `
        SELECT
            b.id,
            b.user_id,
            b.provider_id,
            b.service_id,
            b.booking_period,
            b.status,
            b.notes,
            b.cancellation_reason,
            b.confirmed_at,
            b.cancelled_at,
            b.completed_at,
            b.created_at,
            b.updated_at,
            u.full_name AS customer_name,
            u.email AS customer_email,
            u.phone AS customer_phone,
            s.name AS service_name,
            s.price,
            s.duration_minutes,
            sp.business_name,
            sp.address AS business_address
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN services s ON s.id = b.service_id
        JOIN service_providers sp ON sp.id = b.provider_id
        WHERE b.id = $1
    `,

    getStats: `
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
            (SELECT COUNT(*) FROM users WHERE role = 'provider') AS total_providers,
            (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
            (SELECT COUNT(*) FROM users WHERE is_active = FALSE) AS suspended_users,
            (SELECT COUNT(*) FROM bookings) AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS confirmed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') AS cancelled_bookings,
            (SELECT COUNT(*) FROM services WHERE is_active = TRUE) AS active_services
    `,

    createAuditLog: `
        INSERT INTO system_audit_logs (
            admin_user_id,
            action,
            entity_type,
            entity_id,
            details
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `,

    removeAdmin: `
        UPDATE users
        SET role = 'customer'
        WHERE id = $1
        AND id != $2
        AND role = 'admin'
        RETURNING id, full_name, email, role
    `,
};