import db from '../../config/db/index.js';
import queries from '../queries/queries.services.js';

export const createService = async ({ provider_id, name, description, category, duration_minutes, price }) => {
    return await db.one(queries.createService, [
        provider_id,
        name.trim(),
        description || null,
        category || null,
        duration_minutes,
        price
    ]);
};

export const getServicesByProviderId = async (provider_id) => {
    return await db.manyOrNone(queries.getServicesByProviderId, [provider_id]);
};

export const getActiveServicesByProviderId = async (provider_id) => {
    return await db.manyOrNone(queries.getActiveServicesByProviderId, [provider_id]);
};

export const getServiceById = async (id) => {
    return await db.oneOrNone(queries.getServiceById, [id]);
};

export const updateService = async ({ id, provider_id, name, description, category, duration_minutes, price }) => {
    return await db.oneOrNone(queries.updateService, [
        name || null,
        description || null,
        category || null,
        duration_minutes || null,
        price || null,
        id,
        provider_id
    ]);
};

export const deactivateService = async ({ id, provider_id }) => {
    return await db.oneOrNone(queries.deactivateService, [id, provider_id]);
};

export const getProviderProfileByUserId = async (user_id) => {
    return await db.oneOrNone(queries.getProviderProfileByUserId, [user_id]);
};