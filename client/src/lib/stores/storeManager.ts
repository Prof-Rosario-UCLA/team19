import { get } from 'svelte/store';
import { socket, initializeSocket, availableRooms } from './socket';
import { gameState } from './gameStore';
import type { GameStateUpdatePayload, RoomInfo } from '../../../../types/game.js';
import { GamePhase } from '../../../../types/game.js';

export function initializeStores() {
    const socketInstance = initializeSocket();
    
    // Listen for game state updates
    socketInstance.on('game_state_updated', (payload: GameStateUpdatePayload) => {
        gameState.set(payload.gameState);
    });

    // Listen for room list updates
    socketInstance.on('rooms_updated', (rooms: RoomInfo[]) => {
        availableRooms.set(rooms);
    });

    // Handle disconnection
    socketInstance.on('disconnect', () => {
        gameState.set({
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
    });
} 