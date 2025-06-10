import { Game, GamePhase } from './Game.js';
import { Card } from '../../types/types.js';

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

    createRoom(roomId: string, name: string): GameRoom | null {
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
        return room;
    }

    joinRoom(roomId: string, socketId: string, playerName: string): boolean {
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
        }
        return true;
    }

    leaveRoom(socketId: string): void {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.players.has(socketId)) {
                room.players.delete(socketId);
                if (room.players.size === 0) {
                    this.rooms.delete(roomId);
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

    playCard(roomId: string, socketId: string, card: Card): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return false;

        return room.game.playCard(playerIndex, card);
    }

    selectPassingCards(roomId: string, socketId: string, cards: Card[]): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return false;

        return room.game.selectCardsForPassing(playerIndex, cards);
    }

    getPlayerIndex(roomId: string, socketId: string): number | undefined {
        return this.rooms.get(roomId)?.players.get(socketId);
    }
} 