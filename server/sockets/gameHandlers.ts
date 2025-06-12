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

    socket.on('get_rooms', async (callback) => {
        try {
            callback(gameManager.getRooms());
        } catch (error) {
            console.error('Error getting rooms:', error);
            callback([]);
        }
    });

    socket.on('create_room', async ({ name, hostUser, existingRoomCode }: {
        name: string,
        hostUser?: { user_id: number, username: string },
        existingRoomCode?: string
    }, callback) => {
        try {
            let room_code = existingRoomCode;
            let dbRoom = null;

            if (existingRoomCode) {
                console.log('Using existing room from REST API:', existingRoomCode);
                room_code = existingRoomCode;

                dbRoom = await getRoomByCode(room_code);
                if (!dbRoom) {
                    callback({ success: false, error: 'Room not found in database' });
                    return;
                }
            } else {
                room_code = await generateUniqueRoomCode();

                if (hostUser?.user_id) {
                    dbRoom = await createRoom(room_code, hostUser.user_id);
                    await addPlayerToRoom(dbRoom.game_id, hostUser.user_id, hostUser.username, 'registered');
                }
            }

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
            const success = gameManager.joinRoom(roomId, socket.id, playerName);

            if (success) {
                socket.join(roomId);
                const room = gameManager.getRoom(roomId);
                if (room) {
                    const allPlayerNames = gameManager.getAllPlayerNames(roomId);

                    room.players.forEach((playerIndex, socketId) => {
                        const clientGameState = room.game.getClientGameState(playerIndex);

                        const enhancedGameState = {
                            ...clientGameState,
                            allPlayerNames: allPlayerNames,
                            myPlayerIndex: playerIndex,
                            totalPlayers: room.players.size
                        };

                        io.to(socketId).emit('game_state_updated', {
                            gameState: enhancedGameState,
                            currentPhase: room.game.getCurrentPhase(),
                            currentPlayerIndex: room.game.getCurrentPlayerIndex()
                        });
                    });

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

    socket.on('leave_room', async ({
                                       roomId,
                                       user
                                   }: {
        roomId: string,
        user?: { user_id: number, username: string }
    }, callback) => {
        try {
            if (user?.user_id) {
                const dbRoom = await getRoomByCode(roomId);
                if (dbRoom) {
                    await removePlayerFromRoom(dbRoom.game_id, user.user_id);

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

            gameManager.leaveRoom(socket.id);
            socket.leave(roomId);
            io.emit('rooms_updated', gameManager.getRooms());

            callback({ success: true });
        } catch (error) {
            console.error('Error leaving room:', error);
            callback({ success: false, error: 'Failed to leave room' });
        }
    });

    socket.on('select_passing_cards', ({ roomId, cards }: { roomId: string, cards: Card[] }, callback) => {
        const room = gameManager.getRoom(roomId);
        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const success = gameManager.selectPassingCards(roomId, socket.id, cards);
        if (success) {
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

        console.log(`Player ${playerIndex} attempting to play card:`, card);
        console.log('Current game state:', {
            phase: room.game.getCurrentPhase(),
            currentPlayerIndex: room.game.getCurrentPlayerIndex(),
            isFirstTrick: room.game.getGameState().isFirstTrick,
            currentTrick: room.game.getGameState().currentTrick
        });

        const success = gameManager.playCard(roomId, socket.id, card);
        if (success) {
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

    socket.on('disconnect', async () => {
        try {
            gameManager.leaveRoom(socket.id);
            io.emit('rooms_updated', gameManager.getRooms());
            console.log('User disconnected:', socket.id);
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
}