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
    startGame,
    endGame,
    addBotToRoom,
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

        const response = {
            player_id: player.player_id,
            game_id: player.game_id,
            display_name: player.display_name,
            type: player.type,
            position: playerCount + 1,
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

router.put('/:room_code/start', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;

        // Get room and validate
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if user is the host
        if (room.host_id !== req.user.user_id) {
            return res.status(403).json(errorResponse('NOT_HOST', 'Only the host can start the game'));
        }

        // Check if game is in pending status
        if (room.status !== 'pending') {
            return res.status(400).json(errorResponse('INVALID_STATUS', 'Game is not in pending status'));
        }

        // Check if exactly 4 players
        const playerCount = await getPlayerCountInRoom(room.game_id);
        if (playerCount !== 4) {
            return res.status(400).json(errorResponse('INSUFFICIENT_PLAYERS', 'Hearts requires exactly 4 players'));
        }

        // Start the game
        const updatedRoom = await startGame(room.game_id);

        console.log(`Game started in room ${room_code} by ${req.user.username}`);

        res.json(successResponse({
            game_id: updatedRoom.game_id,
            room_code: updatedRoom.room_code,
            status: updatedRoom.status,
            start_time: updatedRoom.start_time
        }, 'Game started successfully'));

    } catch (error) {
        console.error('Start game error:', error);
        res.status(500).json(errorResponse('START_GAME_FAILED', 'Failed to start game'));
    }
});

router.put('/:room_code/end', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;
        const { final_scores } = req.body;

        // Validate final_scores format
        if (!final_scores || !Array.isArray(final_scores)) {
            return res.status(400).json(errorResponse('INVALID_SCORES', 'final_scores array is required'));
        }

        // Get room and validate
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if user is the host
        if (room.host_id !== req.user.user_id) {
            return res.status(403).json(errorResponse('NOT_HOST', 'Only the host can end the game'));
        }

        // Check if game is in progress
        if (room.status !== 'in_progress') {
            return res.status(400).json(errorResponse('INVALID_STATUS', 'Game is not in progress'));
        }

        // Validate final_scores has correct players
        const players = await getPlayersInRoom(room.game_id);
        if (final_scores.length !== players.length) {
            return res.status(400).json(errorResponse('SCORE_MISMATCH', 'Score count must match player count'));
        }

        // Validate all player_ids exist
        const playerIds = players.map(p => p.player_id);
        for (const score of final_scores) {
            if (!playerIds.includes(score.player_id)) {
                return res.status(400).json(errorResponse('INVALID_PLAYER', `Player ${score.player_id} not found in room`));
            }
            if (typeof score.score !== 'number') {
                return res.status(400).json(errorResponse('INVALID_SCORE', 'All scores must be numbers'));
            }
        }

        // End the game and get rating changes
        const gameResult = await endGame(room.game_id, final_scores);

        // Get final results with placements
        const finalPlayers = await getPlayersInRoom(room.game_id);

        console.log(`Game ended in room ${room_code} by ${req.user.username}`);

        res.json(successResponse({
            game_id: gameResult.room.game_id,
            room_code: gameResult.room.room_code,
            status: gameResult.room.status,
            end_time: gameResult.room.end_time,
            final_results: finalPlayers.map(player => {
                // Find rating change for this player
                const ratingChange = gameResult.rating_changes.find(rc => rc.user_id === player.user_id);

                return {
                    player_id: player.player_id,
                    display_name: player.display_name,
                    score: player.score,
                    placement: player.placement,
                    type: player.type,
                    ...(ratingChange && {
                        old_rating: ratingChange.old_rating,
                        new_rating: ratingChange.new_rating,
                        rating_change: ratingChange.rating_change
                    })
                };
            })
        }, 'Game ended successfully'));

    } catch (error) {
        console.error('End game error:', error);
        res.status(500).json(errorResponse('END_GAME_FAILED', 'Failed to end game'));
    }
});

router.post('/:room_code/add-bot', requireAuth, async (req: any, res: any) => {
    try {
        const room_code = req.params.room_code;
        const {bot_name} = req.body;

        // Validate input
        if (!bot_name || typeof bot_name !== 'string' || bot_name.trim().length === 0) {
            return res.status(400).json(errorResponse('INVALID_BOT_NAME', 'Bot name is required'));
        }

        // Get room and validate
        const room = await getRoomByCode(room_code);
        if (!room) {
            return res.status(404).json(errorResponse('ROOM_NOT_FOUND', 'Room not found'));
        }

        // Check if user is the host
        if (room.host_id !== req.user.user_id) {
            return res.status(403).json(errorResponse('NOT_HOST', 'Only the host can add bots'));
        }

        // Check if room is still pending
        if (room.status !== 'pending') {
            return res.status(400).json(errorResponse('GAME_STARTED', 'Cannot add bots after game has started'));
        }

        // Check if room has space
        const playerCount = await getPlayerCountInRoom(room.game_id);
        if (playerCount >= 4) {
            return res.status(400).json(errorResponse('ROOM_FULL', 'Room is full (4/4 players)'));
        }

        // Check if bot name is unique in room
        const existingNames = await getPlayerNamesInRoom(room.game_id);
        if (existingNames.includes(bot_name.trim())) {
            return res.status(409).json(errorResponse('NAME_TAKEN', 'Bot name is already taken in this room'));
        }

        // Add bot to room
        const bot = await addBotToRoom(room.game_id, bot_name.trim());

        console.log(`Bot ${bot_name} added to room ${room_code} by ${req.user.username}`);

        res.json(successResponse({
            player_id: bot.player_id,
            game_id: bot.game_id,
            display_name: bot.display_name,
            type: bot.type,
            position: playerCount + 1
        }, 'Bot added successfully'));

    } catch (error) {
        console.error('Add bot error:', error);
        res.status(500).json(errorResponse('ADD_BOT_FAILED', 'Failed to add bot'));
    }
});

export default router;