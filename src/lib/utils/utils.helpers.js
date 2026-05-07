import crypto from 'crypto'; // Used for generating random numbers
import jwt from 'jsonwebtoken'; // Used for creating and verifying JWT tokens

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

export const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

export const generateVerificationCode = (length = 6) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
};

export const generateJWTToken = (user) =>
  jwt.sign(
    {
      user_id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

export const decodeJWTToken = (token) => jwt.verify(token, JWT_SECRET);
