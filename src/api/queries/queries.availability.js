export default {

    upsertAvailabilityRule: `
        INSERT INTO availability_rules (
            provider_id, day_of_week, start_time, end_time,
            break_start, break_end, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (provider_id, day_of_week)
        DO UPDATE SET
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            break_start = EXCLUDED.break_start,
            break_end = EXCLUDED.break_end,
            status = EXCLUDED.status,
            updated_at = NOW()
        RETURNING *
    `,

    getAvailabilityRulesByProviderId: `
        SELECT *
        FROM availability_rules
        WHERE provider_id = $1
        ORDER BY day_of_week ASC
    `,

    getAvailabilityRuleByDay: `
        SELECT *
        FROM availability_rules
        WHERE provider_id = $1
        AND day_of_week = $2
    `,

    updateAvailabilityRule: `
        UPDATE availability_rules
        SET
            start_time = COALESCE($1, start_time),
            end_time = COALESCE($2, end_time),
            break_start = $3,
            break_end = $4,
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $6
        AND provider_id = $7
        RETURNING *
    `,

    getBookedPeriodsForDate: `
        SELECT booking_period
        FROM bookings
        WHERE provider_id = $1
        AND status IN ('pending', 'confirmed')
        AND booking_period && tstzrange($2::timestamptz, $3::timestamptz)
    `,

    getServiceDuration: `
        SELECT duration_minutes
        FROM services
        WHERE id = $1
        AND is_active = TRUE
    `,

    getProviderBlocksForDate: `
        SELECT block_period
        FROM provider_blocks
        WHERE provider_id = $1
        AND block_period && tstzrange($2::timestamptz, $3::timestamptz)
    `,

    checkProviderHasAvailability: `
        SELECT COUNT(*) as count
        FROM availability_rules
        WHERE provider_id = $1
    `,

};