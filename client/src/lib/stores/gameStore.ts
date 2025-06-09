import { get, writable } from 'svelte/store';
import { GamePhase } from '../../../../types/game.js';
import type { ClientGameState, Card } from '../../../../types/game.js';
import { socket } from './socket.js';

// Create the game state store with initial values
export const gameState = writable<ClientGameState>({
    players: [],
    currentTrick: [],
    trickLeader: 0,
    heartsBroken: false,
    handNumber: 0,
    isFirstTrick: true,
    tricksPlayed: 0,
    gamePhase: GamePhase.WAITING_FOR_PLAYERS,
    currentPlayerTurn: 0
});


// Game actions that send events to the server
export const gameActions = {
    createRoom: (name: string) => {
        const socketInstance = get(socket);
        if (socketInstance) {
            socketInstance.emit('create_room', { name }, (response) => {
                if (!response.success) {
                    console.error('Failed to create room:', response.error);
                }
            });
        }
    },

    joinRoom: (roomId: string, playerName: string) => {
        const socketInstance = get(socket);
        if (socketInstance) {
            socketInstance.emit('join_room', { roomId, playerName }, (response) => {
                if (!response.success) {
                    console.error('Failed to join room:', response.error);
                }
            });
        }
    },

    playCard: (roomId: string, card: Card) => {
        const socketInstance = get(socket);
        if (socketInstance) {
            socketInstance.emit('play_card', { roomId, card }, (response) => {
                if (!response.success) {
                    console.error('Failed to play card:', response.error);
                }
            });
        }
    },

    selectPassingCards: (roomId: string, cards: Card[]) => {
        const socketInstance = get(socket);
        if (socketInstance) {
            socketInstance.emit('select_passing_cards', { roomId, cards }, (response) => {
                if (!response.success) {
                    console.error('Failed to select passing cards:', response.error);
                }
            });
        }
    }
}; 

