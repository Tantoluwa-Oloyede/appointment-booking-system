import authRoutes from './routes.auth.js';
import serviceRoutes from './routes.services.js';
import availabilityRoutes from './routes.availability.js';
import bookingRoutes from './routes.booking.js';
import adminRoutes from './routes.admin.js';


const routes = (app) => {
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/services', serviceRoutes);
    app.use('/api/v1/availability', availabilityRoutes);
    app.use('/api/v1/bookings', bookingRoutes);
    app.use('/api/v1/admin', adminRoutes);
};

export default routes;



