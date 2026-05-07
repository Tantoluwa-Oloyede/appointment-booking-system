import * as serviceModel from '../models/models.services.js';

// ─── HELPER — gets provider profile from logged in user
// Used in every controller to resolve provider_id from req.user.id

const resolveProviderProfile = async (user_id) => {
    return await serviceModel.getProviderProfileByUserId(user_id);
};


// CREATE SERVICE 
export const createService = async (req, res, next) => {
    try {
        const { name, description, category, duration_minutes, price } = req.body;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can create services'
            });
        }

        // required fields
        if (!name || !duration_minutes || price === undefined) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'name, duration_minutes, and price are required'
            });
        }

        if (name.trim().length < 3) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'name must be at least 3 characters'
            });
        }

        if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'duration_minutes must be a positive integer'
            });
        }

        if (isNaN(price) || price < 0) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'price must be a non-negative number'
            });
        }

        const priceStr = String(price);
        if (priceStr.includes('.') && priceStr.split('.')[1].length > 2) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'price cannot have more than 2 decimal places'
            });
        }

        // get provider profile
        const providerProfile = await resolveProviderProfile(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'You must complete your business profile before creating services'
            });
        }

        const service = await serviceModel.createService({
            provider_id: providerProfile.id,
            name,
            description,
            category,
            duration_minutes,
            price
        });

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Service created successfully',
            data: service
        });

    } catch (error) {
        return next(error);
    }
};


// LIST SERVICES FOR A PROVIDER 
// export const getServices = async (req, res, next) => {
//     try {
//         const { provider_id } = req.query;
//         const { role } = req.user;

//         if (!provider_id) {
//             return res.status(422).json({
//                 status: 'error',
//                 code: 422,
//                 message: 'provider_id is required as a query parameter'
//             });
//         }

//         // providers see all their services, customers see active only
//         const services = role === 'provider'
//             ? await serviceModel.getServicesByProviderId(provider_id)
//             : await serviceModel.getActiveServicesByProviderId(provider_id);

//         return res.status(200).json({
//             status: 'success',
//             code: 200,
//             message: 'Services fetched successfully',
//             data: services
//         });

//     } catch (error) {
//         return next(error);
//     }
// };

export const getServices = async (req, res, next) => {
    try {
        const { provider_id } = req.query;
        const { id: user_id, role } = req.user;

        if (!provider_id) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'provider_id is required as a query parameter'
            });
        }

        let services;

        if (role === 'provider') {
            // verify this provider_id actually belongs to the logged in user
            const providerProfile = await serviceModel.getProviderProfileByUserId(user_id);
            if (!providerProfile || providerProfile.id !== provider_id) {
                // not their profile — treat them like a customer
                services = await serviceModel.getActiveServicesByProviderId(provider_id);
            } else {
                // their own profile — show everything
                services = await serviceModel.getServicesByProviderId(provider_id);
            }
        } else {
            services = await serviceModel.getActiveServicesByProviderId(provider_id);
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Services fetched successfully',
            data: services
        });

    } catch (error) {
        return next(error);
    }
};


// GET ONE SERVICE 
export const getServiceById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const service = await serviceModel.getServiceById(id);
        if (!service) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found'
            });
        }

        // customers cannot see inactive services
        if (!service.is_active && req.user.role !== 'provider' && req.user.role !== 'admin') {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Service fetched successfully',
            data: service
        });

    } catch (error) {
        return next(error);
    }
};


// UPDATE SERVICE 
export const updateService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, category, duration_minutes, price } = req.body;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can update services'
            });
        }

        // at least one field must be provided
        if (!name && !description && !category && !duration_minutes && price === undefined) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'At least one field is required to update'
            });
        }

        if (duration_minutes !== undefined && (!Number.isInteger(duration_minutes) || duration_minutes <= 0)) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'duration_minutes must be a positive integer'
            });
        }

        if (price !== undefined && (isNaN(price) || price < 0)) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'price must be a non-negative number'
            });
        }

        const providerProfile = await resolveProviderProfile(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Provider profile not found'
            });
        }

        const updated = await serviceModel.updateService({
            id,
            provider_id: providerProfile.id,
            name,
            description,
            category,
            duration_minutes,
            price
        });

        // if null — service not found OR doesn't belong to this provider
        if (!updated) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found or you do not have permission to update it'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Service updated successfully',
            data: updated
        });

    } catch (error) {
        return next(error);
    }
};


// DEACTIVATE SERVICE 
export const deactivateService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: user_id, role } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only providers can deactivate services'
            });
        }

        const providerProfile = await resolveProviderProfile(user_id);
        if (!providerProfile) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Provider profile not found'
            });
        }

        const deactivated = await serviceModel.deactivateService({
            id,
            provider_id: providerProfile.id
        });

        if (!deactivated) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'Service not found or you do not have permission to deactivate it'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Service deactivated successfully',
            data: deactivated
        });

    } catch (error) {
        return next(error);
    }
};