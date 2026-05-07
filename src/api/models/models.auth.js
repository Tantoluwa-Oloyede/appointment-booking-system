import db from "../../config/db/index.js";
import queries from "../queries/queries.auth.js";


export const checkUserExistsByEmail = async (email) => {
    return await db.oneOrNone(queries.checkUserExistsByEmail, [
        email.trim().toLowerCase()
    ]);
};

export const checkUserExistsByPhone = async (phone) => {
    return await db.oneOrNone(queries.checkUserExistsByPhone, [
        phone
    ]);
};

export const checkIfUserActivelyExistsByUserId = async (user_id) => {
    return await db.oneOrNone(queries.checkIfUserActivelyExistsByUserId, [user_id]);
};

export const createUser = async ({
    full_name, email, phone, password_hash, role, verification_token, verification_token_expires_at }) => {
    return await db.one(queries.createUser, [
        full_name.trim(),
        email.trim().toLowerCase(),
        phone || null,
        password_hash,
        role,
        verification_token,
        verification_token_expires_at
    ]);
};

export const createProviderProfile = async ({ user_id, business_name, bio, address }) => {
    return await db.one(queries.createProviderProfile, [
        user_id,
        business_name.trim(),
        bio || null,
        address || null
    ]);
};

export const getProviderProfileByUserId = async (user_id) => {
    return await db.oneOrNone(queries.getProviderProfileByUserId, [user_id]);
};



export const findUserByEmailForVerification = async (email) => {
    return await db.oneOrNone(queries.findUserByEmailForVerification, [
        email.trim().toLowerCase()
    ]);
};

export const markUserAsVerified = async (id) => {
    return await db.one(queries.markUserAsVerified, [id]);
};



export const findUserForLogin = async (email) => {
    return await db.oneOrNone(queries.findUserForLogin, [
        email.trim().toLowerCase()
    ]);
};


export const findUserById = async (id) => {
    return await db.oneOrNone(queries.findUserById, [id]);
};

export const checkBusinessNameExists = async (business_name) => {
    return await db.oneOrNone(queries.checkBusinessNameExists, [
        business_name.trim()
    ]);
};

export const getUserById = async (id) => {
    return await db.oneOrNone(queries.getUserById, [id]);
};

export const updateVerificationToken = async ({ email, verification_token, verification_token_expires_at }) => {
    return await db.one(queries.updateVerificationToken, [
        verification_token,
        verification_token_expires_at,
        email.trim().toLowerCase()
    ]);
};

export const updatePasswordResetToken = async ({ email, verification_token, verification_token_expires_at }) => {
    return await db.oneOrNone(queries.updatePasswordResetToken, [
        verification_token,
        verification_token_expires_at,
        email.trim().toLowerCase()
    ]);
};

export const resetPassword = async ({ id, password_hash }) => {
    return await db.one(queries.resetPassword, [password_hash, id]);
};




// export const checkUserExistsByEmail = async (email) => {
//   const user = await db.oneOrNone(queries.checkUserExistsByEmail, [email.trim().toLowerCase()]);
//   return user;
// };

// export const createUser = async ({ full_name, email, phone, password_hash, verification_token, verification_token_expires_at }) => {
//   const user = await db.one(queries.createUser, [
//     full_name.trim(),
//     email.trim().toLowerCase(),
//     phone || null,
//     password_hash,
//     verification_token,
//     verification_token_expires_at
//   ]);
//   return user;
// };