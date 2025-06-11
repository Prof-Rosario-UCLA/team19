import { Game, GamePhase } from './Game.js';
import { Card } from '../../types/types.js';
import { redisService } from '../services/redisService.js';

interface GameRoom {
    game: Game;
    players: Map<string, number>; // socketId -> playerIndex
    roomId: string;
    name: string;
}

export class GameManager {
    private rooms: Map<string, GameRoom>;

    constructor() {
        this.rooms = new Map();
    }

    private async cacheGameState(roomId: string): Promise<void> {
        const room = this.rooms.get(roomId);
        if (room) {
            await redisService.cacheGameState(roomId, room.game.getGameState());
        }
    }

    async createRoom(roomId: string, name: string): Promise<GameRoom | null> {
        if (this.rooms.has(roomId)) {
            return null;
        }

        // Initialize room, game will be properly initialized after 4 players join
        const room: GameRoom = {
            game: new Game([], [], 100),
            players: new Map(),
            roomId,
            name
        };

        this.rooms.set(roomId, room);
        await this.cacheGameState(roomId);
        return room;
    }

    async joinRoom(roomId: string, socketId: string, playerName: string): Promise<boolean> {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        // Check if room is full
        if (room.players.size >= 4) return false;

        // Get next available player index
        const playerIndex = room.players.size;
        room.players.set(socketId, playerIndex);

        // Update game state with new player
        const playerIds = Array.from(room.players.keys());
        const playerNames = Array.from(room.players.entries())
            .sort((a, b) => a[1] - b[1])
            .map((_, i) => i === playerIndex ? playerName : `Player ${i + 1}`);

        // Only create a new game instance when we have all 4 players
        if (playerIds.length === 4) {
            room.game = new Game(playerIds, playerNames, 100);
            await this.cacheGameState(roomId);
        }
        return true;
    }

    async leaveRoom(socketId: string): Promise<void> {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.players.has(socketId)) {
                room.players.delete(socketId);
                if (room.players.size === 0) {
                    this.rooms.delete(roomId);
                    await redisService.deleteGameState(roomId);
                } else {
                    await this.cacheGameState(roomId);
                }
                break;
            }
        }
    }

    getRooms(): Array<{ id: string; name: string; playerCount: number }> {
        return Array.from(this.rooms.entries()).map(([id, room]) => ({
            id,
            name: room.name,
            playerCount: room.players.size
        }));
    }

    getRoom(roomId: string): GameRoom | undefined {
        return this.rooms.get(roomId);
    }

    async playCard(roomId: string, socketId: string, card: Card): Promise<boolean> {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return false;

        // Log the play attempt
        console.log('GameManager playCard:', {
            roomId,
            playerIndex,
            card,
            currentPhase: room.game.getCurrentPhase(),
            currentPlayerIndex: room.game.getCurrentPlayerIndex(),
            isFirstTrick: room.game.getGameState().isFirstTrick
        });

        // Validate it's the correct phase and player's turn
        if (room.game.getCurrentPhase() !== 'PLAYING' || 
            playerIndex !== room.game.getCurrentPlayerIndex()) {
            console.log('Invalid phase or turn:', {
                phase: room.game.getCurrentPhase(),
                currentPlayerIndex: room.game.getCurrentPlayerIndex(),
                playerIndex
            });
            return false;
        }

        // Get valid moves for the player
        const validMoves = room.game.getValidMoves(playerIndex);
        console.log('Valid moves for player:', validMoves);

        // Check if the card is in valid moves
        const isValidMove = validMoves.some(
            validCard => validCard.suit === card.suit && validCard.rank === card.rank
        );

        if (!isValidMove) {
            console.log('Invalid move - card not in valid moves');
            return false;
        }

        const success = room.game.playCard(playerIndex, card);
        if (success) {
            await this.cacheGameState(roomId);
        }
        return success;
    }

    async selectPassingCards(roomId: string, socketId: string, cards: Card[]): Promise<boolean> {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return false;

        const success = room.game.selectCardsForPassing(playerIndex, cards);
        if (success) {
            await this.cacheGameState(roomId);
        }
        return success;
    }

    getPlayerIndex(roomId: string, socketId: string): number | undefined {
        return this.rooms.get(roomId)?.players.get(socketId);
    }
} 