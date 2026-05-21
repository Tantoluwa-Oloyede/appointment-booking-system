import * as adminModel from '../models/models.admin.js';

// log every admin action 
const auditLog = async ({ admin_user_id, action, entity_type, entity_id, details }) => {
    try {
        await adminModel.createAuditLog({
            admin_user_id,
            action,
            entity_type,
            entity_id,
            details
        });
    } catch (_) {
    }
};


// OVERALL STATISTICS OF SITE
export const getStats = async (req, res, next) => {
    try {
        const stats = await adminModel.getStats();

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'System stats fetched successfully',
            data: stats
        });

    } catch (error) {
        return next(error);
    }
};


// GET ALL USERS 
export const getAllUsers = async (req, res, next) => {
    try {
        const { role, is_active, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // validate role filter if provided
        if (role && !['customer', 'provider', 'admin'].includes(role)) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'role must be customer, provider, or admin'
            });
        }

        // convert is_active to boolean if provided
        let isActiveFilter;
        if (is_active !== undefined) {
            if (is_active !== 'true' && is_active !== 'false') {
                return res.status(422).json({
                    status: 'error',
                    code: 422,
                    message: 'is_active must be true or false'
                });
            }
            isActiveFilter = is_active === 'true';
        }

        const [users, { total }] = await Promise.all([
            adminModel.getAllUsers({ role, is_active: isActiveFilter, search, limit, offset }),
            adminModel.countAllUsers({ role, is_active: isActiveFilter, search })
        ]);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Users fetched successfully',
            data: users,
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


// GET ONE USER
export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await adminModel.getUserById(id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'User fetched successfully',
            data: user
        });

    } catch (error) {
        return next(error);
    }
};


// SUSPEND USER 
export const suspendUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: admin_id } = req.user;

        // prevent admin from suspending themselves
        if (id === admin_id) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'You cannot suspend your own account'
            });
        }

        const suspended = await adminModel.suspendUser(id);
        if (!suspended) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found or admin accounts cannot be suspended'
            });
        }

        await auditLog({
            admin_user_id: admin_id,
            action: 'SUSPEND_USER',
            entity_type: 'users',
            entity_id: id,
            details: { suspended_user: suspended.email }
        });

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'User suspended successfully',
            data: suspended
        });

    } catch (error) {
        return next(error);
    }
};


// ACTIVATE USER
export const activateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: admin_id } = req.user;

        const activated = await adminModel.activateUser(id);
        if (!activated) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found'
            });
        }

        await auditLog({
            admin_user_id: admin_id,
            action: 'ACTIVATE_USER',
            entity_type: 'users',
            entity_id: id,
            details: { activated_user: activated.email }
        });

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'User activated successfully',
            data: activated
        });

    } catch (error) {
        return next(error);
    }
};


//  MAKE ADMIN 
export const makeAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: admin_id } = req.user;

        const promoted = await adminModel.makeAdmin(id);
        if (!promoted) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found or is already an admin'
            });
        }

        await auditLog({
            admin_user_id: admin_id,
            action: 'MAKE_ADMIN',
            entity_type: 'users',
            entity_id: id,
            details: { promoted_user: promoted.email }
        });

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'User promoted to admin successfully',
            data: promoted
        });

    } catch (error) {
        return next(error);
    }
};


// GET ALL PROVIDERS 
export const getAllProviders = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const [providers, { total }] = await Promise.all([
            adminModel.getAllProviders({ search, limit, offset }),
            adminModel.countAllProviders({ search })
        ]);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Providers fetched successfully',
            data: providers,
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


// GET ONE PROVIDER 
export const getProviderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const provider = await adminModel.getProviderById(id);
        if (!provider) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Provider not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Provider fetched successfully',
            data: provider
        });

    } catch (error) {
        return next(error);
    }
};


// GET ALL BOOKINGS 
export const getAllBookings = async (req, res, next) => {
    try {
        const { status, provider_id, user_id, date_from, date_to } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // validate status filter
        if (status && !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'status must be pending, confirmed, cancelled, or completed'
            });
        }

        const [bookings, { total }] = await Promise.all([
            adminModel.getAllBookings({
                status,
                provider_id,
                user_id,
                date_from,
                date_to,
                limit,
                offset
            }),
            adminModel.countAllBookings({
                status,
                provider_id,
                user_id,
                date_from,
                date_to
            })
        ]);

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

        const booking = await adminModel.getBookingById(id);
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Booking not found'
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

// REMOVE ADMIN 
export const removeAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: admin_id } = req.user;

        const demoted = await adminModel.removeAdmin(id, admin_id);
        if (!demoted) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found, is not an admin, or you cannot demote yourself'
            });
        }

        await auditLog({
            admin_user_id: admin_id,
            action: 'REMOVE_ADMIN',
            entity_type: 'users',
            entity_id: id,
            details: { demoted_user: demoted.email }
        });

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Admin role removed successfully',
            data: demoted
        });

    } catch (error) {
        return next(error);
    }
};