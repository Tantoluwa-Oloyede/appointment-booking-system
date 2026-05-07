// export default{
//   checkUserExistsByEmail: ` SELECT id, full_name, email, role, is_verified, is_active FROM users WHERE email = $1
//    `,
//   createUser: ` INSERT INTO users ( full_name, email, phone, password_hash, role, is_verified, verification_token, verification_token_expires_at)
//     VALUES ($1, $2, $3, $4, 'customer', FALSE, $5, $6)
//     RETURNING id, full_name, email, phone, role, is_verified, is_active, created_at
//    `,

// }


export default {


    checkUserExistsByEmail: `
        SELECT id, full_name, email, role, is_verified, is_active
        FROM users
        WHERE email = $1
    `,

    checkUserExistsByPhone: `
        SELECT 1 FROM users WHERE phone = $1
    `,

    checkIfUserActivelyExistsByUserId: `
        SELECT id, full_name, email, role, is_verified, is_active
        FROM users
        WHERE id = $1
    `,

    createUser: `
        INSERT INTO users (full_name, email, phone, password_hash, role, verification_token, verification_token_expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, full_name, email, phone, role, is_verified, created_at
    `,

    createProviderProfile: `
        INSERT INTO service_providers (user_id, business_name, bio, address)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, business_name, bio, address, timezone, is_verified, created_at
    `,

    getProviderProfileByUserId: `
        SELECT id FROM service_providers WHERE user_id = $1
    `,



    findUserByEmailForVerification: `
        SELECT id, full_name, email, is_verified, verification_token, verification_token_expires_at
        FROM users
        WHERE email = $1
    `,

    markUserAsVerified: `
        UPDATE users
        SET is_verified = TRUE,
            verification_token = NULL,
            verification_token_expires_at = NULL
        WHERE id = $1
        RETURNING id, full_name, email, role, is_verified
    `,



    findUserForLogin: `
        SELECT id, full_name, email, password_hash, role, is_verified, is_active
        FROM users
        WHERE email = $1
    `,

    findUserById: `
        SELECT id, full_name, email, role, is_verified, is_active
        FROM users
        WHERE id = $1
    `,

    checkBusinessNameExists: `
        SELECT 1 FROM service_providers WHERE business_name = $1
    `,

    getUserById: `
        SELECT id, full_name, email, phone, role, is_verified, is_active, created_at
        FROM users
        WHERE id = $1
    `,

    updateVerificationToken: `
        UPDATE users
        SET verification_token = $1,
            verification_token_expires_at = $2
        WHERE email = $3
        RETURNING id, full_name, email
    `,

    updatePasswordResetToken: `
        UPDATE users
        SET verification_token = $1,
            verification_token_expires_at = $2
        WHERE email = $3
        RETURNING id, full_name, email
    `,

    resetPassword: `
        UPDATE users
        SET password_hash = $1,
        verification_token = NULL,
        verification_token_expires_at = NULL
        WHERE id = $2
        RETURNING id, full_name, email
    `,

};