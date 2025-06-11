import { Game, GamePhase } from './Game.js';
import { Card } from '../../types/types.js';

interface GameRoom {
    game: Game;
    players: Map<string, number>; // socketId -> playerIndex
    playerNames: Map<number, string>; // playerIndex -> playerName
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

        const room: GameRoom = {
            game: new Game([], [], 100),
            players: new Map(),
            playerNames: new Map(), // Track player names
            roomId,
            name
        };

        this.rooms.set(roomId, room);
        return room;
    }

    joinRoom(roomId: string, socketId: string, playerName: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        if (room.players.size >= 4) return false;

        const playerIndex = room.players.size;
        room.players.set(socketId, playerIndex);
        room.playerNames.set(playerIndex, playerName);

        // ALWAYS update the game with current players
        const playerIds = Array.from(room.players.keys());
        const playerNames = [];

        // Get names in correct order for current players
        for (let i = 0; i < room.players.size; i++) {
            playerNames[i] = room.playerNames.get(i) || `Player ${i + 1}`;
        }

        // Update game with current player list (even if less than 4)
        room.game = new Game(playerIds, playerNames, 100);

        return true;
    }

    leaveRoom(socketId: string): void {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.players.has(socketId)) {
                const playerIndex = room.players.get(socketId);
                room.players.delete(socketId);
                if (playerIndex !== undefined) {
                    room.playerNames.delete(playerIndex);
                }
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

    // NEW METHOD: Get player name by socket ID
    getPlayerName(roomId: string, socketId: string): string | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return undefined;

        return room.playerNames.get(playerIndex);
    }

    // NEW METHOD: Get all player names in order
    getAllPlayerNames(roomId: string): string[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];

        const names = [];
        for (let i = 0; i < room.players.size; i++) {
            names[i] = room.playerNames.get(i) || `Player ${i + 1}`;
        }
        return names;
    }

    // ... rest of the methods stay the same
    playCard(roomId: string, socketId: string, card: Card): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const playerIndex = room.players.get(socketId);
        if (playerIndex === undefined) return false;

        console.log('GameManager playCard:', {
            roomId,
            playerIndex,
            card,
            currentPhase: room.game.getCurrentPhase(),
            currentPlayerIndex: room.game.getCurrentPlayerIndex(),
            isFirstTrick: room.game.getGameState().isFirstTrick
        });

        if (room.game.getCurrentPhase() !== 'PLAYING' ||
            playerIndex !== room.game.getCurrentPlayerIndex()) {
            console.log('Invalid phase or turn:', {
                phase: room.game.getCurrentPhase(),
                currentPlayerIndex: room.game.getCurrentPlayerIndex(),
                playerIndex
            });
            return false;
        }

        const validMoves = room.game.getValidMoves(playerIndex);
        console.log('Valid moves for player:', validMoves);

        const isValidMove = validMoves.some(
            validCard => validCard.suit === card.suit && validCard.rank === card.rank
        );

        if (!isValidMove) {
            console.log('Invalid move - card not in valid moves');
            return false;
        }

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