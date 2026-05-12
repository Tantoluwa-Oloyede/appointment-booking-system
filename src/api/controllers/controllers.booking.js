import * as bookingModel from '../models/models.booking.js';
import * as serviceModel from '../models/models.services.js';
import sendMail from '../services/email.js';

const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};


// CREATE BOOKING 
export const createBooking = async (req, res, next) => {
    try {
        const { provider_id, service_id, start_at, notes } = req.body;
        const { id: user_id, role } = req.user;

        if (role !== 'customer') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only customers can create bookings'
            });
        }

        // required fields
        if (!provider_id || !service_id || !start_at) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'provider_id, service_id, and start_at are required'
            });
        }

        // validate start_at format
        const startDate = new Date(start_at);
        if (isNaN(startDate.getTime())) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'start_at must be a valid ISO date string e.g. 2026-05-12T08:00:00.000Z'
            });
        }

        // reject past date
        if (startDate < new Date()) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Cannot book a slot in the past'
            });
        }

        // get service and verify it exists and is active
        const service = await bookingModel.getServiceWithProvider(service_id);
        if (!service || !service.is_active) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found or is no longer active'
            });
        }

        // verify the service belongs to the requested provider
        if (service.provider_id !== provider_id) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'This service does not belong to the specified provider'
            });
        }

        // compute end_at from duration
        const end_at = new Date(startDate.getTime() + service.duration_minutes * 60 * 1000);

        // get day of week in UTC
        const dayOfWeek = startDate.getUTCDay();

        // check provider availability for this day
        const rule = await bookingModel.getProviderAvailabilityForDay(provider_id, dayOfWeek);
        if (!rule) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Provider is not available on this day'
            });
        }

        // check slot falls within working hours
        const slotStartMins = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
        const slotEndMins = slotStartMins + service.duration_minutes;
        const workStartMins = timeToMinutes(rule.start_time);
        const workEndMins = timeToMinutes(rule.end_time);

        if (slotStartMins < workStartMins || slotEndMins > workEndMins) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: `Slot must be within provider working hours: ${rule.start_time} - ${rule.end_time}`
            });
        }

        // check slot doesn't fall in break time
        if (rule.break_start && rule.break_end) {
            const breakStartMins = timeToMinutes(rule.break_start);
            const breakEndMins = timeToMinutes(rule.break_end);
            if (slotStartMins < breakEndMins && slotEndMins > breakStartMins) {
                return res.status(422).json({
                    status: 'error',
                    code: 422,
                    message: `Slot overlaps with provider break time: ${rule.break_start} - ${rule.break_end}`
                });
            }
        }

        // check provider is not blocked for this slot
        const isBlocked = await bookingModel.checkProviderBlockedForSlot(
            provider_id,
            startDate.toISOString(),
            end_at.toISOString()
        );
        if (isBlocked) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Provider is not available during this time'
            });
        }

        // create booking — DB function handles transaction + booking_event
        // exclusion constraint handles double booking at DB level
        let booking_id;
        try {
            const result = await bookingModel.createBooking({
                user_id,
                provider_id,
                service_id,
                start_at: startDate.toISOString(),
                end_at: end_at.toISOString(),
                notes
            });
            booking_id = result.booking_id;
        } catch (dbError) {
            // catch exclusion constraint violation — double booking attempt
            if (dbError.code === '23P01') {
                return res.status(409).json({
                    status: 'error',
                    code: 409,
                    message: 'This slot has just been taken. Please choose another time.'
                });
            }
            throw dbError;
        }

        // fetch full booking details to return
        const booking = await bookingModel.getBookingById(booking_id);

        // send confirmation email — non-blocking
        const emailContent = `Hello ${booking.customer_name}, your booking for ${booking.service_name} at ${booking.business_name} has been received. Your appointment is on ${startDate.toUTCString()}. We will notify you once it is confirmed.`;
        sendMail(booking.customer_email, 'Booking Received', emailContent).catch(() => {});

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Booking created successfully',
            data: booking
        });

    } catch (error) {
        return next(error);
    }
};


// LIST BOOKINGS 
export const getBookings = async (req, res, next) => {
    try {
        const { id: user_id, role } = req.user;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        let bookings, total;

        if (role === 'customer') {
            [bookings, { total }] = await Promise.all([
                bookingModel.getBookingsByUserId(user_id, limit, offset),
                bookingModel.countBookingsByUserId(user_id)
            ]);
        } else if (role === 'provider') {
            const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
            if (!providerProfile) {
                return res.status(403).json({
                    status: 'error',
                    code: 403,
                    message: 'Provider profile not found'
                });
            }
            [bookings, { total }] = await Promise.all([
                bookingModel.getBookingsByProviderId(providerProfile.id, limit, offset),
                bookingModel.countBookingsByProviderId(providerProfile.id)
            ]);
        } else {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Access denied'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Bookings fetched successfully',
            data: bookings,
            pagination: {
                total: parseInt(total),
                page,
                limit,
                total_pages: Math.ceil(parseInt(total) / limit)
            }
        });

    } catch (error) {
        return next(error);
    }
};


// GET ONE BOOKING 
export const getBookingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: user_id, role } = req.user;

        const booking = await bookingModel.getBookingById(id);
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Booking not found'
            });
        }

        // permission check — only the customer who owns it,
        // the provider it belongs to, or an admin can see it
        const providerProfile = role === 'provider'
            ? await serviceModel.getProviderProfileByUserId(user_id)
            : null;

        const isOwner = booking.user_id === user_id;
        const isProvider = providerProfile && providerProfile.id === booking.provider_id;
        const isAdmin = role === 'admin';

        if (!isOwner && !isProvider && !isAdmin) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'You do not have permission to view this booking'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Booking fetched successfully',
            data: booking
        });

    } catch (error) {
        return next(error);
    }
};



// CONFIRM BOOKING 
export const confirmBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can confirm bookings'
            });
        }

        const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Provider profile not found'
            });
        }

        const confirmed = await bookingModel.confirmBooking(id, providerProfile.id);
        if (!confirmed) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Booking not found, not in pending status, or you do not have permission to confirm it'
            });
        }

        const booking = await bookingModel.getBookingById(id);
        const emailContent = `Hello ${booking.customer_name}, your booking for ${booking.service_name} at ${booking.business_name} has been confirmed! See you soon.`;
        sendMail(booking.customer_email, 'Booking Confirmed', emailContent).catch(() => {});

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Booking confirmed successfully',
            data: confirmed
        });

    } catch (error) {
        return next(error);
    }
};

// CANCEL BOOKING 
export const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const { id: user_id, role } = req.user;

        let cancelled;

        if (role === 'customer') {
            cancelled = await bookingModel.cancelBookingAsCustomer(id, user_id, reason);
        } else if (role === 'provider') {
            const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
            if (!providerProfile) {
                return res.status(403).json({
                    status: 'error',
                    code: 403,
                    message: 'Provider profile not found'
                });
            }
            cancelled = await bookingModel.cancelBookingAsProvider(id, providerProfile.id, reason);
        } else {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Access denied'
            });
        }

        if (!cancelled) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Booking not found, already cancelled, or you do not have permission to cancel it'
            });
        }

        // fetch full details for email
        const booking = await bookingModel.getBookingById(id);
        const emailContent = `Hello ${booking.customer_name}, your booking for ${booking.service_name} at ${booking.business_name} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`;
        sendMail(booking.customer_email, 'Booking Cancelled', emailContent).catch(() => {});

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Booking cancelled successfully',
            data: cancelled
        });

    } catch (error) {
        return next(error);
    }
};


// COMPLETE BOOKING 
export const completeBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can mark bookings as completed'
            });
        }

        const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Provider profile not found'
            });
        }

        const completed = await bookingModel.completeBooking(id, providerProfile.id);
        if (!completed) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Booking not found, not in confirmed status, or you do not have permission to complete it'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Booking marked as completed',
            data: completed
        });

    } catch (error) {
        return next(error);
    }
};