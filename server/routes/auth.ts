import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '../utils/responses.js';
import {
    getUserByAuthId,
    getUserByUsername,
    getUserByEmail,
    createUser
} from '../db/queries.js';

const router = Router();

// Helper function to generate JWT token
const generateToken = (user: any) => {
    const payload = {
        user_id: user.user_id,
        auth_id: user.auth_id,
        auth_provider: user.auth_provider,
        username: user.username
    };

    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d', // Token expires in 7 days
        issuer: 'hearts-game',
        audience: 'hearts-game-users'
    });
};

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

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json(errorResponse('INVALID_EMAIL', 'Invalid email format'));
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

        // Generate JWT token for immediate login
        const token = generateToken({
            ...newUser,
            auth_id,
            auth_provider
        });

        res.status(201).json(successResponse({
            user: newUser,
            token,
            expires_in: '7d'
        }, 'User registered successfully'));

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

        // Generate JWT token with user info
        const token = generateToken(user);

        res.json(successResponse({
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                avatar_url: user.avatar_url,
                rating: user.rating,
                join_date: user.join_date
            },
            token,
            expires_in: '7d'
        }, 'Login successful'));

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(errorResponse('LOGIN_FAILED', 'Login failed'));
    }
});

export default router;