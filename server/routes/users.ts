import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/responses.js';

const router = Router();

router.get('/:user_id', async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;

        // TODO: Validate user_id is a number
        // TODO: Query database for user by user_id
        // TODO: Handle user not found

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const user = {
            user_id: parseInt(user_id),
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null,
            rating: 1000,
            join_date: new Date()
        };

        res.json(successResponse(user));
    } catch (error) {
        res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
});

router.put('/:user_id', requireAuth, async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;
        const { username, avatar_url } = req.body;

        // TODO: Validate user owns this profile (user_id matches req.user.user_id)
        // TODO: Validate input data (username format, avatar_url format)
        // TODO: Check if username is already taken by another user
        // TODO: Update user in database

        console.log('Current user:', req.user.username);

        res.json(successResponse({ message: 'Profile updated successfully' }));
    } catch (error) {
        res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to update profile'));
    }
});

router.get('/:user_id/stats', async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;

        // TODO: Validate user_id
        // TODO: Calculate stats from completed games in database
        // TODO: Count wins (placement = 1), games played, etc.
        // TODO: Calculate average scores, best/worst scores
        // TODO: Calculate rating changes over time periods

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const stats = {
            games_played: 25,
            wins: 8,
            win_rate: 0.32,
            avg_score: 65.4,
            best_score: 12,
            worst_score: 95,
            current_rating: 1150,
            rating_change_30_days: +75
        };

        res.json(successResponse(stats));
    } catch (error) {
        res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
});

router.get('/:user_id/history', async (req: any, res: any) => {
    try {
        const user_id = req.params.user_id;
        const limit = req.query.limit || '10';
        const offset = req.query.offset || '0';

        // TODO: Validate user_id, limit, offset
        // TODO: Query completed games for this user
        // TODO: Include game details, final scores, placements
        // TODO: Order by most recent first
        // TODO: Implement pagination (if needed)

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const games = [
            {
                game_id: 5,
                room_code: 'HRT789',
                start_time: new Date(),
                end_time: new Date(),
                score: 67,
                placement: 2,
                rating_change: +15
            }
        ];

        res.json(successResponse({ games, total: 25 }));
    } catch (error) {
        res.status(404).json(errorResponse('USER_NOT_FOUND', 'User not found'));
    }
});

export default router;