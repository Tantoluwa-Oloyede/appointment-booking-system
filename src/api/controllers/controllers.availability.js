import * as availabilityModel from '../models/models.availability.js';
import * as serviceModel from '../models/models.services.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const isValidTimeFormat = (timeStr) => {
    if (typeof timeStr !== 'string') return false;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(timeStr);
};

const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

// SHARED RULE VALIDATOR 
const validateRule = (rule, context = 'set') => {
    const { day_of_week, status, start_time, end_time, break_start, break_end } = rule;

    // day_of_week
    if (day_of_week === undefined || !Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
        return 'day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)';
    }

    // status
    if (!status || !['open', 'closed'].includes(status)) {
        return `status must be either "open" or "closed" for ${DAYS[day_of_week]}`;
    }

    // closed day must not have any time fields
    if (status === 'closed') {
        if (start_time || end_time || break_start || break_end) {
            return `${DAYS[day_of_week]} is closed. Do not provide start_time, end_time, or break times for closed days`;
        }
        return null;
    }

    // open day validations
    if (!start_time || !end_time) {
        return `start_time and end_time are required for ${DAYS[day_of_week]}`;
    }

    if (!isValidTimeFormat(start_time)) {
        return `start_time has invalid format for ${DAYS[day_of_week]} — use HH:MM (e.g. 08:00)`;
    }

    if (!isValidTimeFormat(end_time)) {
        return `end_time has invalid format for ${DAYS[day_of_week]} — use HH:MM (e.g. 17:00)`;
    }

    if (break_start && !isValidTimeFormat(break_start)) {
        return `break_start has invalid format for ${DAYS[day_of_week]} — use HH:MM (e.g. 12:00)`;
    }
    
    if (break_end && !isValidTimeFormat(break_end)) {
        return `break_end has invalid format for ${DAYS[day_of_week]} — use HH:MM (e.g. 13:00)`;
    }

    const startMins = timeToMinutes(start_time);
    const endMins = timeToMinutes(end_time);

    if (startMins >= endMins) {
        return `start_time must be before end_time for ${DAYS[day_of_week]}`;
    }

    // break time validations
    if ((break_start && !break_end) || (!break_start && break_end)) {
        return `both break_start and break_end must be provided together for ${DAYS[day_of_week]}`;
    }

    if (break_start && break_end) {
        const breakStartMins = timeToMinutes(break_start);
        const breakEndMins = timeToMinutes(break_end);

        if (breakStartMins >= breakEndMins) {
            return `break_start must be before break_end for ${DAYS[day_of_week]}`;
        }

        if (breakStartMins < startMins) {
            return `break_start cannot be before the working start time for ${DAYS[day_of_week]}`;
        }

        if (breakEndMins > endMins) {
            return `break_end cannot be after the working end time for ${DAYS[day_of_week]}`;
        }
    }

    return null;
};


// SET AVAILABILITY 
// Provider sets their weekly schedule for the first time
export const setAvailability = async (req, res, next) => {
    try {
        const { rules } = req.body;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can set availability'
            });
        }


        const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'You must complete your business profile before setting availability'
            });
        }

        // block if provider already has availability set
        const existing = await availabilityModel.checkProviderHasAvailability(providerProfile.id);
        if (parseInt(existing.count) > 0) {
            return res.status(409).json({
                status: 'error',
                code: 409,
                message: 'Availability already set.'
            });
        }

        // validate every rule one after the other
        for (const rule of rules) {
            const error = validateRule(rule);
            if (error) {
                return res.status(422).json({
                    status: 'error',
                    code: 422,
                    message: error
                });
            }
        }

        // save all rules
        const saved = await Promise.all(
            rules.map(rule => availabilityModel.upsertAvailabilityRule({
                provider_id: providerProfile.id,
                day_of_week: rule.day_of_week,
                start_time: rule.status === 'open' ? rule.start_time : '00:00',
                end_time: rule.status === 'open' ? rule.end_time : '23:59',
                break_start: rule.status === 'open' ? (rule.break_start || null) : null,
                break_end: rule.status === 'open' ? (rule.break_end || null) : null,
                status: rule.status
            }))
        );

        const formatted = saved.map(rule => ({
            ...rule,
            day_name: DAYS[rule.day_of_week]
        }));

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Availability set successfully',
            data: formatted
        });

    } catch (error) {
        return next(error);
    }
};


// GET AVAILABILITY 
export const getAvailability = async (req, res, next) => {
    try {
        const { provider_id } = req.query;

        if (!provider_id) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'provider_id is required as a query parameter'
            });
        }

        const rules = await availabilityModel.getAvailabilityRulesByProviderId(provider_id);

        if (!rules || rules.length === 0) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'No availability rules found for this provider'
            });
        }

        const formatted = rules.map(rule => ({
            ...rule,
            day_name: DAYS[rule.day_of_week]
        }));

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Availability fetched successfully',
            data: formatted
        });

    } catch (error) {
        return next(error);
    }
};


// UPDATE ONE DAY 
export const updateAvailabilityRule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { start_time, end_time, break_start, break_end, status } = req.body;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can update availability'
            });
        }


        // open day validations
        if (status === 'open' || (!status && (start_time || end_time))) {
            if (start_time && end_time) {
                if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
                    return res.status(422).json({
                        status: 'error',
                        code: 422,
                        message: 'start_time must be before end_time'
                    });
                }
            }

            if ((break_start && !break_end) || (!break_start && break_end)) {
                return res.status(422).json({
                    status: 'error',
                    code: 422,
                    message: 'both break_start and break_end must be provided together'
                });
            }
 
            if (break_start && break_end) {
                const breakStartMins = timeToMinutes(break_start);
                const breakEndMins = timeToMinutes(break_end);

                if (breakStartMins >= breakEndMins) {
                    return res.status(422).json({
                        status: 'error',
                        code: 422,
                        message: 'break_start must be before break_end'
                    });
                }

                if (start_time && breakStartMins < timeToMinutes(start_time)) {
                    return res.status(422).json({
                        status: 'error',
                        code: 422,
                        message: 'break_start cannot be before working start_time'
                    });
                }

                if (end_time && breakEndMins > timeToMinutes(end_time)) {
                    return res.status(422).json({
                        status: 'error',
                        code: 422,
                        message: 'break_end cannot be after working end_time'
                    });
                }
            }
        }

        const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Provider profile not found'
            });
        }

        const updated = await availabilityModel.updateAvailabilityRule({
            id,
            provider_id: providerProfile.id,
            start_time: status === 'closed' ? '00:00' : (start_time || null),
            end_time: status === 'closed' ? '23:59' : (end_time || null),
            break_start: status === 'closed' ? null : (break_start || null),
            break_end: status === 'closed' ? null : (break_end || null),
            status
        });

        if (!updated) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Availability rule not found or you do not have permission to update it'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Availability updated successfully',
            data: { ...updated, day_name: DAYS[updated.day_of_week] }
        });

    } catch (error) {
        return next(error);
    }
};

// GET AVAILABLE SLOTS 
export const getAvailableSlots = async (req, res, next) => {
    try {
        const { provider_id, service_id, date } = req.query;


        // Validate it is a real calendar date
        const parsedDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(parsedDate.getTime())) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Date is not a valid calendar date'
            });
        } // checking if .getTime is a valid number (date)

        // Reject past dates
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (parsedDate < today) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Date cannot be in the past'
            });
        }

        // Returning a number 0-6 for weekday using UTC
        const dayOfWeek = parsedDate.getUTCDay();

        // get provider rule for the selected day
        const rule = await availabilityModel.getAvailabilityRuleByDay(provider_id, dayOfWeek);
        if (!rule || rule.status === 'closed') {
            return res.status(200).json({
                status: 'success',
                code: 200,
                message: `Provider is not available on ${DAYS[dayOfWeek]}`,
                data: []
            });
        }

        // get service
        const service = await availabilityModel.getServiceDuration(service_id);
        if (!service) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found or is no longer active'
            });
        }

        const duration = service.duration_minutes;

        // build day range
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);

        // Fetch existing bookings and times provider is not available ( blocked )
        const [bookedPeriods, providerBlocks] = await Promise.all([
            availabilityModel.getBookedPeriodsForDate( provider_id, dayStart.toISOString(), dayEnd.toISOString() ),
            availabilityModel.getProviderBlocksForDate( provider_id, dayStart.toISOString(), dayEnd.toISOString() )
        ]);

        // generate slots
        const workStart = timeToMinutes(rule.start_time);
        const workEnd = timeToMinutes(rule.end_time);
        const breakStart = rule.break_start ? timeToMinutes(rule.break_start) : null;
        const breakEnd = rule.break_end ? timeToMinutes(rule.break_end) : null;

        const slots = [];
        let current = workStart;

        while (current + duration <= workEnd) {
            const slotStart = current;
            const slotEnd = current + duration;

            const overlapsBreak = breakStart !== null &&
                slotStart < breakEnd && slotEnd > breakStart;

            if (!overlapsBreak) {
                const slotStartISO = new Date(`${date}T${minutesToTime(slotStart)}:00.000Z`).toISOString();
                const slotEndISO = new Date(`${date}T${minutesToTime(slotEnd)}:00.000Z`).toISOString();
                // const slotStart = new Date(slotStartISO).getTime();
                // const slotEnd = new Date(slotEndISO).getTime();
                const slotStartMs = new Date(slotStartISO).getTime();
                const slotEndMs = new Date(slotEndISO).getTime();

                const isBooked = bookedPeriods.some(b => {
                    const bStart = new Date(b.booking_period.start ?? b.booking_period).getTime();
                    const bEnd = new Date(b.booking_period.end ?? b.booking_period).getTime();
                    // return slotStart < bEnd && slotEnd > bStart;
                    return slotStartMs < bEnd && slotEnd > bStart;
                });

                const isBlocked = providerBlocks.some(b => {
                    const bStart = new Date(b.block_period.start ?? b.block_period).getTime();
                    const bEnd = new Date(b.block_period.end ?? b.block_period).getTime();
                    // return slotStart < bEnd && slotEnd > bStart;
                    return slotStartMs < bEnd && slotEnd > bStart;
                });

                if (!isBooked && !isBlocked) {
                    slots.push({
                        start: slotStartISO,
                        end: slotEndISO,
                        duration_minutes: duration
                    });
                }
            }

            current += duration;
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: slots.length > 0
                ? `${slots.length} slot(s) available on ${DAYS[dayOfWeek]}`
                : `No available slots on ${DAYS[dayOfWeek]}`,
            data: slots
        });

    } catch (error) {
        return next(error);
    }
};



// ISO mean International Organization For Standardizaion