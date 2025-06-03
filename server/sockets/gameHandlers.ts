import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager.js';
import { Card } from '../game/types.js';

export function registerGameHandlers(io: Server, socket: Socket, gameManager: GameManager) {
    // Get list of available rooms
    socket.on('get_rooms', (callback) => {
        callback(gameManager.getRooms());
    });

    // Create a new room
    // TODO: connect this to PostgreSQL database to store the rooms
    socket.on('create_room', ({ name }: { name: string }, callback) => {
        const roomId = Math.random().toString(36).substring(7);
        const room = gameManager.createRoom(roomId, name);
        if (room) {
            callback({ success: true, roomId });
            io.emit('rooms_updated', gameManager.getRooms());
        } else {
            callback({ success: false, error: 'Failed to create room' });
        }
    });

    // Join a room
    socket.on('join_room', ({ roomId, playerName }: { roomId: string, playerName: string }, callback) => {
        const success = gameManager.joinRoom(roomId, socket.id, playerName);
        if (success) {
            socket.join(roomId);
            const room = gameManager.getRoom(roomId);
            if (room) {
                // Broadcast updated game state to all players in the room
                io.to(roomId).emit('game_state_updated', {
                    gameState: room.game.getGameState(),
                    currentPhase: room.game.getCurrentPhase(),
                    currentPlayerIndex: room.game.getCurrentPlayerIndex()
                });
                // Broadcast updated room list to all connected clients
                io.emit('rooms_updated', gameManager.getRooms());
            }
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Failed to join room' });
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
            // Broadcast updated game state to all players in the room
            io.to(roomId).emit('game_state_updated', {
                gameState: room.game.getGameState(),
                currentPhase: room.game.getCurrentPhase(),
                currentPlayerIndex: room.game.getCurrentPlayerIndex()
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

        const success = gameManager.playCard(roomId, socket.id, card);
        if (success) {
            // Broadcast updated game state to all players in the room
            io.to(roomId).emit('game_state_updated', {
                gameState: room.game.getGameState(),
                currentPhase: room.game.getCurrentPhase(),
                currentPlayerIndex: room.game.getCurrentPlayerIndex()
            });
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Invalid move' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        gameManager.leaveRoom(socket.id);
        io.emit('rooms_updated', gameManager.getRooms());
        console.log('User disconnected:', socket.id);
    });
} 