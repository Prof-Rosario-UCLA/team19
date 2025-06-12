import { getUserByAuthId, getUserById } from '../db/queries.js';
import jwt from 'jsonwebtoken';

export const requireAuth = async (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify JWT token
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

        // Get user from database
        let user = null;
        if (decoded.user_id) {
            user = await getUserById(decoded.user_id);
        }
        if (!user && decoded.auth_id && decoded.auth_provider) {
            user = await getUserByAuthId(decoded.auth_id, decoded.auth_provider);
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();

    } catch (error: any) {
        console.error('Auth error:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }

        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export const optionalAuth = async (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            try {
                // Try to verify token and get user
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

                let user = null;
                if (decoded.user_id) {
                    user = await getUserById(decoded.user_id);
                }
                if (!user && decoded.auth_id && decoded.auth_provider) {
                    user = await getUserByAuthId(decoded.auth_id, decoded.auth_provider);
                }

                if (user) {
                    req.user = user;
                }
            } catch (error) {
                console.warn('Optional auth failed:', error);
            }
        }

        next();
    } catch (error) {
        next();
    }
};