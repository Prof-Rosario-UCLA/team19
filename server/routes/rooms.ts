// server/routes/rooms.ts - Implemented version
import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import {
    generateUniqueRoomCode,
    createRoom,
    getRoomByCode,
    addPlayerToRoom,
    getPlayersInRoom,
    getPlayerCountInRoom,
    getPlayerInRoom,
    getPlayerNamesInRoom,
    removePlayerFromRoom,
    transferHostToNextPlayer,
    deleteRoom,
    generateGuestSessionToken
} from '../db/queries.js';

const router = Router();

router.post('/', requireAuth, async (req: any, res: any) => {
    try {
        const mode = req.body.mode || 'normal';

        // Generate unique 6-character room code
        const room_code = await generateUniqueRoomCode();

        // Insert new room into database
        const room = await createRoom(room_code, req.user.user_id, mode);

        // Add host as first player in room
        await addPlayerToRoom(room.game_id, req.user.user_id, req.user.username, 'registered');

        // Return room with join URL
        const response = {
            ...room,
            join_url: `${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:5173'}/join/${room_code}`,
            created_at: room.start_time
        };

        res.status(201).json(successResponse(response, 'Room created successfully'));
    } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json(errorResponse('ROOM_CREATION_FAILED', 'Failed to create room'));
    }
});

router.get('/:room_code', optionalAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // Validate room code format
        if (!room_code || room_code.length !== 6) {
            return res.status(400).json(errorResponse('INVALID_ROOM_CODE', 'Room code must be 6 characters'));
        }

        // Query database for room by room_code
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Get all players in the room
        const players = await getPlayersInRoom(room.game_id);

        // Check if room is joinable (status, player count)
        const current_players = players.length;
        const can_join = room.status === 'pending' && current_players < 4;

        console.log('User viewing room:', req.user?.username || 'Anonymous');

        const response = {
            game_id: room.game_id,
            room_code: room.room_code,
            host_id: room.host_id,
            host_username: room.host_username,
            host_avatar: room.host_avatar,
            start_time: room.start_time,
            end_time: room.end_time,
            status: room.status,
            mode: room.mode,
            max_players: 4,
            current_players,
            can_join,
            players: players.map(player => ({
                player_id: player.player_id,
                user_id: player.user_id,
                display_name: player.display_name,
                score: player.score,
                placement: player.placement,
                type: player.type,
                avatar_url: player.avatar_url,
                rating: player.rating
            }))
        };

        res.json(successResponse(response));
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json(errorResponse('ROOM_FETCH_FAILED', 'Failed to fetch room'));
    }
});

router.post('/:room_code/join', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // Get room by code and validate it exists
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if room is joinable (pending status, < 4 players)
        if (room.status !== 'pending') {
            return res.status(400).json(errorResponse('GAME_ALREADY_STARTED', 'Cannot join - game is not pending'));
        }

        const playerCount = await getPlayerCountInRoom(room.game_id);
        if (playerCount >= 4) {
            return res.status(400).json(errorResponse('ROOM_FULL', 'Room is full (4/4 players)'));
        }

        // Check if user is already in the room
        const existingPlayer = await getPlayerInRoom(room.game_id, req.user.user_id);
        if (existingPlayer) {
            return res.status(400).json(errorResponse('ALREADY_IN_ROOM', 'You are already in this room'));
        }

        // Add player to room in database
        const player = await addPlayerToRoom(
            room.game_id,
            req.user.user_id,
            req.user.username,
            'registered'
        );

        const response = {
            player_id: player.player_id,
            game_id: player.game_id,
            display_name: player.display_name,
            type: player.type,
            position: playerCount + 1 // Position in the room (1-4)
        };

        res.json(successResponse(response, 'Joined room successfully'));
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json(errorResponse('JOIN_FAILED', 'Failed to join room'));
    }
});

router.post('/:room_code/join-guest', async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;
        const display_name = req.body.display_name;

        // Validate display_name is provided and not empty
        if (!display_name || typeof display_name !== 'string' || display_name.trim().length === 0) {
            return res.status(400).json(errorResponse('INVALID_DISPLAY_NAME', 'Display name is required'));
        }

        if (display_name.trim().length > 50) {
            return res.status(400).json(errorResponse('DISPLAY_NAME_TOO_LONG', 'Display name must be 50 characters or less'));
        }

        // Get room by code and validate it exists
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if room is joinable
        if (room.status !== 'pending') {
            return res.status(400).json(errorResponse('GAME_ALREADY_STARTED', 'Cannot join - game is not pending'));
        }

        const playerCount = await getPlayerCountInRoom(room.game_id);
        if (playerCount >= 4) {
            return res.status(400).json(errorResponse('ROOM_FULL', 'Room is full (4/4 players)'));
        }

        // Check if display_name is unique in this room
        const existingNames = await getPlayerNamesInRoom(room.game_id);
        if (existingNames.includes(display_name.trim())) {
            return res.status(409).json(errorResponse('NAME_TAKEN', 'Display name is already taken in this room'));
        }

        // Add guest player to room
        const player = await addPlayerToRoom(
            room.game_id,
            null, // No user_id for guests
            display_name.trim(),
            'guest'
        );

        // Generate session token for guest
        const session_token = generateGuestSessionToken();

        const response = {
            player_id: player.player_id,
            game_id: player.game_id,
            display_name: player.display_name,
            type: player.type,
            position: playerCount + 1,
            session_token
        };

        res.json(successResponse(response, 'Joined room as guest'));
    } catch (error) {
        console.error('Guest join error:', error);
        res.status(500).json(errorResponse('JOIN_FAILED', 'Failed to join room as guest'));
    }
});

router.delete('/:room_code/leave', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // Get room by code
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if game hasn't started yet (can only leave pending games)
        if (room.status !== 'pending') {
            return res.status(400).json(errorResponse('GAME_STARTED', 'Cannot leave after game has started'));
        }

        // Check if user is in the room
        const player = await getPlayerInRoom(room.game_id, req.user.user_id);
        if (!player) {
            return res.status(400).json(errorResponse('NOT_IN_ROOM', 'You are not in this room'));
        }

        // Remove player from room
        await removePlayerFromRoom(room.game_id, req.user.user_id);

        // If host leaves, handle appropriately
        if (room.host_id === req.user.user_id) {
            const remainingPlayers = await getPlayersInRoom(room.game_id);

            if (remainingPlayers.length === 0) {
                // No players left, delete the room
                await deleteRoom(room.game_id);
                console.log(`Room ${room_code} deleted - no players remaining`);
            } else {
                // Transfer host to the first remaining registered user, or first player if no registered users
                const newHost = remainingPlayers.find(p => p.type === 'registered' && p.user_id) || remainingPlayers[0];
                if (newHost && newHost.user_id) {
                    await transferHostToNextPlayer(room.game_id, newHost.user_id);
                    console.log(`Host transferred from ${req.user.username} to ${newHost.display_name} in room ${room_code}`);
                }
            }
        }

        console.log(`User ${req.user.username} left room ${room_code}`);

        res.json(successResponse(null, 'Left room successfully'));
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json(errorResponse('LEAVE_FAILED', 'Failed to leave room'));
    }
});

export default router;