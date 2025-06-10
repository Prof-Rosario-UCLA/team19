import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager.js';
import { Card } from '../../types/types.js';
import {
    generateUniqueRoomCode,
    createRoom,
    getRoomByCode,
    addPlayerToRoom,
    getPlayersInRoom,
    getPlayerCountInRoom,
    removePlayerFromRoom,
    deleteRoom,
    transferHostToNextPlayer
} from '../db/queries.js';

export function registerGameHandlers(io: Server, socket: Socket, gameManager: GameManager) {

    // Get list of available rooms
    socket.on('get_rooms', async (callback) => {
        try {
            // For now, keep using in-memory GameManager rooms
            callback(gameManager.getRooms());
        } catch (error) {
            console.error('Error getting rooms:', error);
            callback([]);
        }
    });

    // Create a new room or use existing room from REST API
    socket.on('create_room', async ({ name, hostUser, existingRoomCode }: {
        name: string,
        hostUser?: { user_id: number, username: string },
        existingRoomCode?: string
    }, callback) => {
        try {
            let room_code = existingRoomCode;
            let dbRoom = null;

            if (existingRoomCode) {
                // Room was already created via REST API, just set up socket room
                console.log('Using existing room from REST API:', existingRoomCode);
                room_code = existingRoomCode;

                // Get the existing room from database
                dbRoom = await getRoomByCode(room_code);
                if (!dbRoom) {
                    callback({ success: false, error: 'Room not found in database' });
                    return;
                }
            } else {
                // Generate unique room code for new room
                room_code = await generateUniqueRoomCode();

                if (hostUser?.user_id) {
                    // Authenticated user - store in database
                    dbRoom = await createRoom(room_code, hostUser.user_id);
                    await addPlayerToRoom(dbRoom.game_id, hostUser.user_id, hostUser.username, 'registered');
                }
            }

            // Create in GameManager for real-time game state
            const gameRoom = gameManager.createRoom(room_code, name);

            if (gameRoom) {
                callback({
                    success: true,
                    roomId: room_code,
                    gameId: dbRoom?.game_id,
                    joinUrl: `/join/${room_code}`
                });
                io.emit('rooms_updated', gameManager.getRooms());
            } else {
                callback({ success: false, error: 'Failed to create game room in memory' });
            }
        } catch (error) {
            console.error('Error creating room:', error);
            callback({ success: false, error: 'Failed to create room' });
        }
    });

    // Join a room (checks database)
    socket.on('join_room', async ({
                                      roomId,
                                      playerName,
                                      user
                                  }: {
        roomId: string,
        playerName: string,
        user?: { user_id: number, username: string }
    }, callback) => {
        try {
            // Check if room exists in database
            const dbRoom = await getRoomByCode(roomId);

            if (dbRoom && user?.user_id) {
                // Room exists in DB and user is authenticated
                const playerCount = await getPlayerCountInRoom(dbRoom.game_id);

                if (playerCount >= 4) {
                    callback({ success: false, error: 'Room is full' });
                    return;
                }

                if (dbRoom.status !== 'pending') {
                    callback({ success: false, error: 'Game already started' });
                    return;
                }

                // Check if user is already in the room
                const existingPlayer = await getPlayersInRoom(dbRoom.game_id);
                const userAlreadyInRoom = existingPlayer.find(p => p.user_id === user.user_id);

                if (!userAlreadyInRoom) {
                    // Add to database
                    await addPlayerToRoom(dbRoom.game_id, user.user_id, user.username, 'registered');
                }
            }

            // Always try to join the GameManager room for real-time gameplay
            const success = gameManager.joinRoom(roomId, socket.id, playerName);

            if (success) {
                socket.join(roomId);
                const room = gameManager.getRoom(roomId);
                if (room) {
                    // Send individual game states to each player
                    room.players.forEach((playerIndex, socketId) => {
                        const clientGameState = room.game.getClientGameState(playerIndex);
                        io.to(socketId).emit('game_state_updated', {
                            gameState: clientGameState,
                            currentPhase: room.game.getCurrentPhase(),
                            currentPlayerIndex: room.game.getCurrentPlayerIndex()
                        });
                    });
                    // Broadcast updated room list
                    io.emit('rooms_updated', gameManager.getRooms());
                }
                callback({ success: true });
            } else {
                callback({ success: false, error: 'Failed to join room - room may not exist in game manager' });
            }
        } catch (error) {
            console.error('Error joining room:', error);
            callback({ success: false, error: 'Failed to join room' });
        }
    });

    // Leave room (updates database)
    socket.on('leave_room', async ({
                                       roomId,
                                       user
                                   }: {
        roomId: string,
        user?: { user_id: number, username: string }
    }, callback) => {
        try {
            // Remove from database if authenticated user
            if (user?.user_id) {
                const dbRoom = await getRoomByCode(roomId);
                if (dbRoom) {
                    await removePlayerFromRoom(dbRoom.game_id, user.user_id);

                    // Handle host transfer or room deletion
                    if (dbRoom.host_id === user.user_id) {
                        const remainingPlayers = await getPlayersInRoom(dbRoom.game_id);
                        if (remainingPlayers.length === 0) {
                            await deleteRoom(dbRoom.game_id);
                        } else {
                            const newHost = remainingPlayers.find(p => p.type === 'registered' && p.user_id) || remainingPlayers[0];
                            if (newHost?.user_id) {
                                await transferHostToNextPlayer(dbRoom.game_id, newHost.user_id);
                            }
                        }
                    }
                }
            }

            // Remove from GameManager
            gameManager.leaveRoom(socket.id);
            socket.leave(roomId);
            io.emit('rooms_updated', gameManager.getRooms());

            callback({ success: true });
        } catch (error) {
            console.error('Error leaving room:', error);
            callback({ success: false, error: 'Failed to leave room' });
        }
    });

    // Select cards for passing
    socket.on('select_passing_cards', ({ roomId, cards }: { roomId: string, cards: Card[] }, callback) => {
        const room = gameManager.getRoom(roomId);
        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const success = gameManager.selectPassingCards(roomId, socket.id, cards);
        if (success) {
            // Send individual game states to each player
            room.players.forEach((playerIndex, socketId) => {
                const clientGameState = room.game.getClientGameState(playerIndex);
                io.to(socketId).emit('game_state_updated', {
                    gameState: clientGameState,
                    currentPhase: room.game.getCurrentPhase(),
                    currentPlayerIndex: room.game.getCurrentPlayerIndex()
                });
            });
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Invalid selection' });
        }
    });

    // Play a card
    socket.on('play_card', ({ roomId, card }: { roomId: string, card: Card }, callback) => {
        const room = gameManager.getRoom(roomId);
        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const playerIndex = room.players.get(socket.id);
        if (playerIndex === undefined) {
            callback({ success: false, error: 'Player not found in room' });
            return;
        }

        // Log the attempt to play card
        console.log(`Player ${playerIndex} attempting to play card:`, card);
        console.log('Current game state:', {
            phase: room.game.getCurrentPhase(),
            currentPlayerIndex: room.game.getCurrentPlayerIndex(),
            isFirstTrick: room.game.getGameState().isFirstTrick,
            currentTrick: room.game.getGameState().currentTrick
        });

        const success = gameManager.playCard(roomId, socket.id, card);
        if (success) {
            // Send individual game states to each player
            room.players.forEach((playerIndex, socketId) => {
                const clientGameState = room.game.getClientGameState(playerIndex);
                io.to(socketId).emit('game_state_updated', {
                    gameState: clientGameState,
                    currentPhase: room.game.getCurrentPhase(),
                    currentPlayerIndex: room.game.getCurrentPlayerIndex()
                });
            });
            callback({ success: true });
        } else {
            console.log('Play card failed for player', playerIndex);
            callback({ success: false, error: 'Invalid move' });
        }
    });

    // Handle disconnection (updates database)
    socket.on('disconnect', async () => {
        try {
            // GameManager handles the in-memory cleanup
            gameManager.leaveRoom(socket.id);
            io.emit('rooms_updated', gameManager.getRooms());
            console.log('User disconnected:', socket.id);
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
}