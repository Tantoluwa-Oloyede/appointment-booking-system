// ADMIN VERIFICATION
// Attach after verifyToken on all admin routes
// verifyToken runs first, sets req.user, then this checks the role
export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            code: 403,
            message: 'Access denied. Admin only.'
        });
    }
    return next();
};