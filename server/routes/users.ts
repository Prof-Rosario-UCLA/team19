import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import {
    getUserById,
    getUserByUsername,
    updateUser,
    getUserStats,
} from '../db/queries.js';

const router = Router();

router.get('/:user_id', async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;

        // Validate user_id is a number
        const userId = parseInt(user_id);
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json(errorResponse('INVALID_USER_ID', 'Invalid user ID'));
        }

        // Query database for user by user_id
        const user = await getUserById(userId);

        // Handle user not found
        if (!user) {
            return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
        }

        res.json(successResponse(user));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json(errorResponse('USER_FETCH_FAILED', 'Failed to fetch user'));
    }
});

router.put('/:user_id', requireAuth, async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;
        const { username, avatar_url } = req.body;

        // Validate user_id is a number
        const userId = parseInt(user_id);
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json(errorResponse('INVALID_USER_ID', 'Invalid user ID'));
        }

        // Validate user owns this profile
        if (userId !== req.user.user_id) {
            return res.status(403).json(errorResponse('FORBIDDEN', 'Cannot update another user\'s profile'));
        }

        // Validate input data
        if (username !== undefined) {
            if (typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 50) {
                return res.status(400).json(errorResponse('INVALID_USERNAME', 'Username must be 2-50 characters'));
            }

            // Check if username is already taken by another user
            const existingUser = await getUserByUsername(username.trim());
            if (existingUser && existingUser.user_id !== userId) {
                return res.status(409).json(errorResponse('USERNAME_TAKEN', 'Username is already taken'));
            }
        }

        if (avatar_url !== undefined && avatar_url !== null) {
            if (typeof avatar_url !== 'string' || avatar_url.length > 500) {
                return res.status(400).json(errorResponse('INVALID_AVATAR_URL', 'Avatar URL must be a valid string under 500 characters'));
            }
        }

        // Prepare updates object
        const updates: { username?: string; avatar_url?: string } = {};
        if (username !== undefined) updates.username = username.trim();
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json(errorResponse('NO_UPDATES', 'No valid updates provided'));
        }

        // Update user in database
        const updatedUser = await updateUser(userId, updates);

        res.json(successResponse(updatedUser, 'Profile updated successfully'));
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to update profile'));
    }
});

router.get('/:user_id/stats', async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;

        // Validate user_id
        const userId = parseInt(user_id);
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json(errorResponse('INVALID_USER_ID', 'Invalid user ID'));
        }

        // Check if user exists
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
        }

        // Calculate stats from completed games in database
        const stats = await getUserStats(userId);

        res.json(successResponse(stats));
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json(errorResponse('STATS_FETCH_FAILED', 'Failed to fetch user statistics'));
    }
});
export default router;