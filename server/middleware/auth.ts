import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // TODO: Verify JWT token (use jsonwebtoken library)
        // TODO: Decode token to get user_id or auth_id
        // TODO: Query database to get full user details
        // TODO: Handle expired/invalid tokens

        // TEMPORARY: Mock user data - REMOVE WHEN IMPLEMENTING ABOVE
        req.user = {
            user_id: 1,
            auth_id: 'mock_123',
            auth_provider: 'google',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: 'https://example.com/avatar.jpg',
            join_date: new Date(),
            rating: 1000
        };

        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const optionalAuth = (req: any, res: any, next: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            // TODO: Same JWT verification logic as requireAuth
            // TODO: If token is invalid, just continue without setting req.user
            // TODO: Don't return error for optional auth

            // TEMPORARY: Mock user data - REMOVE WHEN IMPLEMENTING ABOVE
            req.user = {
                user_id: 1,
                auth_id: 'mock_123',
                auth_provider: 'google',
                username: 'testuser',
                email: 'test@example.com',
                avatar_url: 'https://example.com/avatar.jpg',
                join_date: new Date(),
                rating: 1000
            };
        }

        next();
    } catch (error) {
        next();
    }
};