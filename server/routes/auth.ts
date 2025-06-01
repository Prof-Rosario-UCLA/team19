import { Router } from 'express';
import { successResponse, errorResponse } from '../utils/responses.js';
import {
    getUserByAuthId,
    getUserByUsername,
    getUserByEmail,
    createUser
} from '../db/queries.js';

const router = Router();

router.post('/register', async (req: any, res: any) => {
    try {
        const { auth_id, auth_provider, username, email, avatar_url } = req.body;

        // Validate input data
        if (!auth_id || !auth_provider || !username || !email) {
            return res.status(400).json(errorResponse(
                'MISSING_FIELDS',
                'auth_id, auth_provider, username, and email are required'
            ));
        }

        // Check if user already exists by auth_id + auth_provider
        const existingAuthUser = await getUserByAuthId(auth_id, auth_provider);
        if (existingAuthUser) {
            return res.status(409).json(errorResponse('USER_EXISTS', 'User already registered with this auth provider'));
        }

        // Check if username is already taken
        const existingUsername = await getUserByUsername(username);
        if (existingUsername) {
            return res.status(409).json(errorResponse('USERNAME_TAKEN', 'Username is already taken'));
        }

        // Check if email is already taken
        const existingEmail = await getUserByEmail(email);
        if (existingEmail) {
            return res.status(409).json(errorResponse('EMAIL_TAKEN', 'Email is already registered'));
        }

        // Insert new user into database
        const newUser = await createUser({
            auth_id,
            auth_provider,
            username,
            email,
            avatar_url
        });

        // TODO: Generate JWT token for immediate login

        res.status(201).json(successResponse(newUser, 'User registered successfully'));
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json(errorResponse('REGISTRATION_FAILED', 'Failed to register user'));
    }
});

router.post('/login', async (req: any, res: any) => {
    try {
        const { auth_id, auth_provider } = req.body;

        // Validate input data
        if (!auth_id || !auth_provider) {
            return res.status(400).json(errorResponse('MISSING_FIELDS', 'auth_id and auth_provider are required'));
        }

        // Query database to find user by auth_id + auth_provider
        const user = await getUserByAuthId(auth_id, auth_provider);

        if (!user) {
            return res.status(401).json(errorResponse('USER_NOT_FOUND', 'User not found with these credentials'));
        }

        // TODO: Generate JWT token with user info

        res.json(successResponse(user, 'Login successful'));
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(errorResponse('LOGIN_FAILED', 'Login failed'));
    }
});

export default router;