import db from '../../config/db/index.js';
import queries from '../queries/queries.availability.js';



export const upsertAvailabilityRule = async ({
    provider_id, day_of_week, start_time, end_time,
    break_start, break_end, status
}) => {
    return await db.one(queries.upsertAvailabilityRule, [
        provider_id,
        day_of_week,
        start_time,
        end_time,
        break_start || null,
        break_end || null,
        status
    ]);
};


export const getAvailabilityRulesByProviderId = async (provider_id) => {
    return await db.manyOrNone(queries.getAvailabilityRulesByProviderId, [provider_id]);
};

export const getAvailabilityRuleByDay = async (provider_id, day_of_week) => {
    return await db.oneOrNone(queries.getAvailabilityRuleByDay, [provider_id, day_of_week]);
};


export const updateAvailabilityRule = async ({
    id, provider_id, start_time, end_time, break_start, break_end, status
}) => {
    return await db.oneOrNone(queries.updateAvailabilityRule, [
        start_time || null,
        end_time || null,
        break_start || null,
        break_end || null,
        status || null,
        id,
        provider_id
    ]);
};


export const getBookedPeriodsForDate = async (provider_id, dayStart, dayEnd) => {
    return await db.manyOrNone(queries.getBookedPeriodsForDate, [
        provider_id, dayStart, dayEnd
    ]);
};

export const getServiceDuration = async (service_id) => {
    return await db.oneOrNone(queries.getServiceDuration, [service_id]);
};

export const getProviderBlocksForDate = async (provider_id, dayStart, dayEnd) => {
    return await db.manyOrNone(queries.getProviderBlocksForDate, [
        provider_id, dayStart, dayEnd
    ]);
};

export const checkProviderHasAvailability = async (provider_id) => {
    return await db.one(queries.checkProviderHasAvailability, [provider_id]);
};