import { Router } from 'express';
import { successResponse, errorResponse } from '../utils/responses.js';
import { getLeaderboard, getLeaderboardCount } from '../db/queries.js';

const router = Router();

router.get('/', async (req: any, res: any) => {
    try {
        const limit = req.query.limit || '100';
        const offset = req.query.offset || '0';

        // Validate limit and offset
        const limitNum = parseInt(limit as string);
        const offsetNum = parseInt(offset as string);

        if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
            return res.status(400).json(errorResponse('INVALID_LIMIT', 'Limit must be between 1 and 100'));
        }

        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json(errorResponse('INVALID_OFFSET', 'Offset must be 0 or greater'));
        }

        // Get leaderboard data
        const [players, totalCount] = await Promise.all([
            getLeaderboard(limitNum, offsetNum),
            getLeaderboardCount()
        ]);

        // Format response with ranking
        const rankedPlayers = players.map((player, index) => ({
            rank: offsetNum + index + 1,
            user_id: player.user_id,
            username: player.username,
            rating: player.rating,
            avatar_url: player.avatar_url,
            join_date: player.join_date,
            games_played: parseInt(player.games_played) || 0,
            wins: parseInt(player.wins) || 0,
            win_percentage: parseFloat(player.win_percentage) || 0
        }));

        res.json(successResponse({
            players: rankedPlayers,
            total: totalCount,
            limit: limitNum,
            offset: offsetNum
        }));

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json(errorResponse('LEADERBOARD_FAILED', 'Failed to fetch leaderboard'));
    }
});

export default router;