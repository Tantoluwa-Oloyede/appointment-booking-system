import * as authModel from '../models/models.auth.js';
import * as Helpers from '../../lib/utils/utils.helpers.js';

export const verifyToken = async function (req, res, next) {
    try {
      let token = req.headers.authorization;
      if (!token) {
          return res.status(401).json({
              status: 'error',
              code: 401,
              message: 'Please provide a token'
          })
      }

      if (!token.startsWith('Bearer ')) {
      return res.status(401).json({
          status: 'error',
          code: 401,
          message: 'Invalid token sent'
      })
      }

      if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
      }

      const decodedToken = Helpers.decodeJWTToken(token);
      console.log('DECODED TOKEN:', decodedToken);

      const user = await authModel.checkIfUserActivelyExistsByUserId(decodedToken.user_id);
      if (!user) {
          return res.status(401).json({
              status: 'error',
              code: 401,
              message: 'Invalid token'
          })
      }

        if (!user.is_active) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Your account has been suspended. Please contact support.'
            });
        }

        if (!user.is_verified) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Please verify your email before accessing this resource.'
            });
        }
      req.user = user;
      return next();
    } catch (error) {
      if (error.message) {
          if (error.message.trim().toLowerCase() === 'jwt expired') {
            return res.status(401).json({
              status: 'error',
              code: 401,
              message: 'Session timeout'
            })
          }
          return res.status(401).json({
              status: 'error',
              code: 401,
              message: error.message
          })
      }
    }
}

