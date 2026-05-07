import authRoutes from './routes.auth.js';
import serviceRoutes from './routes.services.js';


const routes = (app) => {
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/services', serviceRoutes);
};

export default routes;



