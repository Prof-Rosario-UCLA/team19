import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/responses.js';

const router = Router();

router.post('/', requireAuth, async (req: any, res: any) => {
    try {
        const mode = req.body.mode || 'normal';

        // TODO: Generate unique 6-character room code
        // TODO: Ensure room code doesn't already exist
        // TODO: Insert new room into database
        // TODO: Add host as first player in room

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const room = {
            game_id: 1,
            room_code: 'HRT123',
            host_id: req.user.user_id,
            status: 'pending',
            mode,
            join_url: `http://localhost:5173/join/HRT123`,
            created_at: new Date()
        };

        res.status(201).json(successResponse(room, 'Room created successfully'));
    } catch (error) {
        res.status(500).json(errorResponse('ROOM_CREATION_FAILED', 'Failed to create room'));
    }
});

router.get('/:room_code', optionalAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // TODO: Query database for room by room_code
        // TODO: Get all players in the room
        // TODO: Check if room is joinable (status, player count)
        // TODO: Get host username

        console.log('User viewing room:', req.user?.username || 'Anonymous');

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const room = {
            game_id: 1,
            room_code,
            host_id: 1,
            host_username: 'testuser',
            start_time: new Date(),
            end_time: null,
            status: 'pending',
            mode: 'normal',
            max_players: 4,
            current_players: 2,
            can_join: true,
            players: [
                {
                    player_id: 1,
                    user_id: 1,
                    display_name: 'testuser',
                    score: 0,
                    type: 'registered'
                }
            ]
        };

        res.json(successResponse(room));
    } catch (error) {
        res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
    }
});

router.post('/:room_code/join', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // TODO: Get room by code and validate it exists
        // TODO: Check if room is joinable (pending status, < 4 players)
        // TODO: Check if user is already in the room
        // TODO: Add player to room in database

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const player = {
            player_id: 2,
            game_id: 1,
            display_name: req.user.username,
            type: 'registered',
            position: 2
        };

        res.json(successResponse(player, 'Joined room successfully'));
    } catch (error) {
        res.status(400).json(errorResponse('JOIN_FAILED', 'Failed to join room'));
    }
});

router.post('/:room_code/join-guest', async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;
        const display_name = req.body.display_name;

        // TODO: Validate display_name is provided and not empty
        // TODO: Get room by code and validate it exists
        // TODO: Check if room is joinable
        // TODO: Check if display_name is unique in this room
        // TODO: Add guest player to room
        // TODO: Generate session token for guest

        // TEMPORARY: Mock response - REMOVE WHEN IMPLEMENTING ABOVE
        const player = {
            player_id: 3,
            game_id: 1,
            display_name,
            type: 'guest',
            position: 3,
            session_token: 'guest_abc123'
        };

        res.json(successResponse(player, 'Joined room as guest'));
    } catch (error) {
        res.status(400).json(errorResponse('JOIN_FAILED', 'Failed to join room'));
    }
});

router.delete('/:room_code/leave', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // TODO: Get room by code
        // TODO: Check if game hasn't started yet (can only leave pending games)
        // TODO: Remove player from room
        // TODO: If host leaves, either transfer host or delete room

        console.log(`User ${req.user.username} leaving room ${room_code}`);

        res.json(successResponse(null, 'Left room successfully'));
    } catch (error) {
        res.status(400).json(errorResponse('LEAVE_FAILED', 'Failed to leave room'));
    }
});

export default router;