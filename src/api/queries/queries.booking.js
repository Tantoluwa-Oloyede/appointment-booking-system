export default {

    createBooking: `
        SELECT create_booking($1, $2, $3, $4, $5, $6) AS booking_id
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
            s.name AS service_name,
            s.duration_minutes,
            s.price,
            sp.business_name
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN services s ON s.id = b.service_id
        JOIN service_providers sp ON sp.id = b.provider_id
        WHERE b.id = $1
    `,

    getBookingsByUserId: `
        SELECT
            b.id,
            b.provider_id,
            b.service_id,
            b.booking_period,
            b.status,
            b.notes,
            b.created_at,
            s.name AS service_name,
            s.price,
            sp.business_name
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        JOIN service_providers sp ON sp.id = b.provider_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3
    `,

    getBookingsByProviderId: `
        SELECT
            b.id,
            b.user_id,
            b.service_id,
            b.booking_period,
            b.status,
            b.notes,
            b.created_at,
            u.full_name AS customer_name,
            u.email AS customer_email,
            s.name AS service_name,
            s.price
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN services s ON s.id = b.service_id
        WHERE b.provider_id = $1
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3
    `,

    confirmBooking: `
        UPDATE bookings
        SET status = 'confirmed',
            confirmed_at = NOW()
        WHERE id = $1
        AND provider_id = $2
        AND status = 'pending'
        RETURNING *
    `,

    cancelBookingAsCustomer: `
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = $3
        WHERE id = $1
        AND user_id = $2
        AND status IN ('pending', 'confirmed')
        RETURNING *
    `,

    cancelBookingAsProvider: `
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = $3
        WHERE id = $1
        AND provider_id = $2
        AND status IN ('pending', 'confirmed')
        RETURNING *
    `,

    completeBooking: `
        UPDATE bookings
        SET status = 'completed',
            completed_at = NOW()
        WHERE id = $1
        AND provider_id = $2
        AND status = 'confirmed'
        RETURNING *
    `,

    getServiceWithProvider: `
        SELECT
            s.id,
            s.name,
            s.duration_minutes,
            s.price,
            s.is_active,
            s.provider_id,
            sp.id AS service_provider_id,
            sp.business_name
        FROM services s
        JOIN service_providers sp ON sp.id = s.provider_id
        WHERE s.id = $1
    `,

    getProviderAvailabilityForDay: `
        SELECT *
        FROM availability_rules
        WHERE provider_id = $1
        AND day_of_week = $2
        AND status = 'open'
    `,

    checkProviderBlockedForSlot: `
        SELECT id
        FROM provider_blocks
        WHERE provider_id = $1
        AND block_period && tstzrange($2::timestamptz, $3::timestamptz)
    `,

    getProviderProfileById: `
        SELECT id, user_id, business_name
        FROM service_providers
        WHERE id = $1
    `,

    countBookingsByUserId: `
        SELECT COUNT(*) as total FROM bookings WHERE user_id = $1
    `,

    countBookingsByProviderId: `
        SELECT COUNT(*) as total FROM bookings WHERE provider_id = $1
    `,
};