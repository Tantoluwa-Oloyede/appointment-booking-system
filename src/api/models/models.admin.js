import db from '../../config/db/index.js';
import queries from '../queries/queries.admin.js';

export const getAllUsers = async ({ role, is_active, search, limit, offset }) => {
    return await db.manyOrNone(queries.getAllUsers, [
        role || null,
        is_active !== undefined ? String(is_active) : null,
        search || null,
        limit,
        offset
    ]);
};

export const countAllUsers = async ({ role, is_active, search }) => {
    return await db.one(queries.countAllUsers, [
        role || null,
        is_active !== undefined ? String(is_active) : null,
        search || null
    ]);
};

export const getUserById = async (id) => {
    return await db.oneOrNone(queries.getUserById, [id]);
};

export const suspendUser = async (id) => {
    return await db.oneOrNone(queries.suspendUser, [id]);
};

export const activateUser = async (id) => {
    return await db.oneOrNone(queries.activateUser, [id]);
};

export const makeAdmin = async (id) => {
    return await db.oneOrNone(queries.makeAdmin, [id]);
};

export const getAllProviders = async ({ search, limit, offset }) => {
    return await db.manyOrNone(queries.getAllProviders, [
        search || null,
        limit,
        offset
    ]);
};

export const countAllProviders = async ({ search }) => {
    return await db.one(queries.countAllProviders, [search || null]);
};

export const getProviderById = async (id) => {
    return await db.oneOrNone(queries.getProviderById, [id]);
};

export const getAllBookings = async ({
    status, provider_id, user_id, date_from, date_to, limit, offset
}) => {
    return await db.manyOrNone(queries.getAllBookings, [
        status || null,
        provider_id || null,
        user_id || null,
        date_from || null,
        date_to || null,
        limit,
        offset
    ]);
};

export const countAllBookings = async ({
    status, provider_id, user_id, date_from, date_to
}) => {
    return await db.one(queries.countAllBookings, [
        status || null,
        provider_id || null,
        user_id || null,
        date_from || null,
        date_to || null
    ]);
};

export const getBookingById = async (id) => {
    return await db.oneOrNone(queries.getBookingById, [id]);
};

export const getStats = async () => {
    return await db.one(queries.getStats);
};

export const createAuditLog = async ({
    admin_user_id, action, entity_type, entity_id, details }) => {
    return await db.one(queries.createAuditLog, [
        admin_user_id,
        action,
        entity_type,
        entity_id || null,
        details ? JSON.stringify(details) : null
    ]);
};


export const removeAdmin = async (id, admin_id) => {
    return await db.oneOrNone(queries.removeAdmin, [id, admin_id]);
};