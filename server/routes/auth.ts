import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '../utils/responses.js';
import {
    getUserByAuthId,
    createInternalAuthUser,
    validateInternalAuthUser,
    checkInternalAuthExists
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
        expiresIn: '7d',
        issuer: 'hearts-game',
        audience: 'hearts-game-users'
    });
};

// Internal auth registration
router.post('/register', async (req: any, res: any) => {
    try {
        const { username, email, password } = req.body;

        // Validate input data
        if (!username || !email || !password) {
            return res.status(400).json(errorResponse(
                'MISSING_FIELDS',
                'Username, email, and password are required'
            ));
        }

        // Basic validation
        if (username.trim().length < 3) {
            return res.status(400).json(errorResponse(
                'INVALID_USERNAME',
                'Username must be at least 3 characters'
            ));
        }

        if (password.length < 6) {
            return res.status(400).json(errorResponse(
                'INVALID_PASSWORD',
                'Password must be at least 6 characters'
            ));
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json(errorResponse('INVALID_EMAIL', 'Invalid email format'));
        }

        // Check if username or email already exists
        const existing = await checkInternalAuthExists(username.trim(), email.trim());

        if (existing.username_exists) {
            return res.status(409).json(errorResponse('USERNAME_TAKEN', 'Username is already taken'));
        }

        if (existing.email_exists) {
            return res.status(409).json(errorResponse('EMAIL_TAKEN', 'Email is already registered'));
        }

        // Create the user
        const result = await createInternalAuthUser({
            username: username.trim(),
            email: email.trim(),
            password
        });

        // Generate JWT token for immediate login
        const token = generateToken(result.user);

        res.status(201).json(successResponse({
            user: {
                user_id: result.user.user_id,
                username: result.user.username,
                email: result.user.email,
                avatar_url: result.user.avatar_url,
                rating: result.user.rating,
                join_date: result.user.join_date
            },
            token,
            expires_in: '7d'
        }, 'Account created successfully'));

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json(errorResponse('REGISTRATION_FAILED', 'Failed to create account'));
    }
});

// Internal auth login
router.post('/login', async (req: any, res: any) => {
    try {
        const { username, password } = req.body;

        // Validate input data
        if (!username || !password) {
            return res.status(400).json(errorResponse(
                'MISSING_FIELDS',
                'Username/email and password are required'
            ));
        }

        // Validate user credentials
        const user = await validateInternalAuthUser(username.trim(), password);

        if (!user) {
            return res.status(401).json(errorResponse(
                'INVALID_CREDENTIALS',
                'Invalid username/email or password'
            ));
        }

        // Generate JWT token
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

// Test endpoint
router.get('/test', (req, res) => {
    res.json(successResponse({ message: 'Auth route working' }));
});

export default router;