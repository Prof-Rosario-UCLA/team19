import { Router } from 'express';
import { successResponse, errorResponse } from '../utils/responses.js';

const router = Router();

router.post('/register', async (req: any, res: any) => {
    try {
        const { auth_id, auth_provider, username, email, avatar_url } = req.body;

        // TODO: Validate input data (required fields, email format, etc.)
        // TODO: Check if user already exists by auth_id + auth_provider
        // TODO: Check if username/email already taken
        // TODO: Insert new user into database
        // TODO: Generate JWT token for immediate login

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const newUser = {
            user_id: 1,
            username,
            email,
            rating: 1000,
            join_date: new Date()
        };

        res.status(201).json(successResponse(newUser, 'User registered successfully'));
    } catch (error) {
        res.status(500).json(errorResponse('REGISTRATION_FAILED', 'Failed to register user'));
    }
});

router.post('/login', async (req: any, res: any) => {
    try {
        const { auth_id, auth_provider } = req.body;

        // TODO: Validate input data
        // TODO: Query database to find user by auth_id + auth_provider
        // TODO: Generate JWT token with user info
        // TODO: Return user data + token

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const user = {
            user_id: 1,
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null,
            rating: 1000,
            join_date: new Date()
        };

        res.json(successResponse(user, 'Login successful'));
    } catch (error) {
        res.status(401).json(errorResponse('LOGIN_FAILED', 'Invalid credentials'));
    }
});

export default router;