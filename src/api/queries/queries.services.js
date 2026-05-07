export default {

    
    createService: `
        INSERT INTO services (provider_id, name, description, category, duration_minutes, price)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, provider_id, name, description, category, duration_minutes, price, is_active, created_at
    `,

   
    getServicesByProviderId: `
        SELECT id, provider_id, name, description, category, duration_minutes, price, is_active, created_at
        FROM services
        WHERE provider_id = $1
        ORDER BY created_at DESC
    `,

    getActiveServicesByProviderId: `
        SELECT id, provider_id, name, description, category, duration_minutes, price, is_active, created_at
        FROM services
        WHERE provider_id = $1
        AND is_active = TRUE
        ORDER BY created_at DESC
    `,

    getServiceById: `
        SELECT id, provider_id, name, description, category, duration_minutes, price, is_active, created_at
        FROM services
        WHERE id = $1
    `,

    
    updateService: `
        UPDATE services
        SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            duration_minutes = COALESCE($4, duration_minutes),
            price = COALESCE($5, price)
        WHERE id = $6
        AND provider_id = $7
        RETURNING id, provider_id, name, description, category, duration_minutes, price, is_active, updated_at
    `,

    
    deactivateService: `
        UPDATE services
        SET is_active = FALSE
        WHERE id = $1
        AND provider_id = $2
        RETURNING id, provider_id, name, is_active, updated_at
    `,

    
    getProviderProfileByUserId: `
        SELECT id FROM service_providers WHERE user_id = $1
    `,
};