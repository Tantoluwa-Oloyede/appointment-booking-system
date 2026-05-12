import db from '../../config/db/index.js';
import queries from '../queries/queries.booking.js';

// CREATE 
export const createBooking = async ({
    user_id, provider_id, service_id, start_at, end_at, notes
}) => {
    return await db.one(queries.createBooking, [
        user_id,
        provider_id,
        service_id,
        start_at,
        end_at,
        notes || null
    ]);
};


export const getBookingById = async (id) => {
    return await db.oneOrNone(queries.getBookingById, [id]);
};

export const getBookingsByUserId = async (user_id, limit, offset) => {
    return await db.manyOrNone(queries.getBookingsByUserId, [user_id, limit, offset]);
};

export const getBookingsByProviderId = async (provider_id, limit, offset) => {
    return await db.manyOrNone(queries.getBookingsByProviderId, [provider_id, limit, offset]);
};

export const countBookingsByUserId = async (user_id) => {
    return await db.one(queries.countBookingsByUserId, [user_id]);
};

export const countBookingsByProviderId = async (provider_id) => {
    return await db.one(queries.countBookingsByProviderId, [provider_id]);
};

// STATUS UPDATES 

export const confirmBooking = async (id, provider_id) => {
    return await db.oneOrNone(queries.confirmBooking, [id, provider_id]);
};

export const cancelBookingAsCustomer = async (id, user_id, reason) => {
    return await db.oneOrNone(queries.cancelBookingAsCustomer, [id, user_id, reason || null]);
};

export const cancelBookingAsProvider = async (id, provider_id, reason) => {
    return await db.oneOrNone(queries.cancelBookingAsProvider, [id, provider_id, reason || null]);
};

export const completeBooking = async (id, provider_id) => {
    return await db.oneOrNone(queries.completeBooking, [id, provider_id]);
};

// HELPERS

export const getServiceWithProvider = async (service_id) => {
    return await db.oneOrNone(queries.getServiceWithProvider, [service_id]);
};

export const getProviderAvailabilityForDay = async (provider_id, day_of_week) => {
    return await db.oneOrNone(queries.getProviderAvailabilityForDay, [provider_id, day_of_week]);
};

export const checkProviderBlockedForSlot = async (provider_id, start_at, end_at) => {
    return await db.oneOrNone(queries.checkProviderBlockedForSlot, [provider_id, start_at, end_at]);
};

export const getProviderProfileById = async (provider_id) => {
    return await db.oneOrNone(queries.getProviderProfileById, [provider_id]);
};