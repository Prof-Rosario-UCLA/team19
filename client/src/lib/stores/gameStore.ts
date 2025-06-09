import { writable } from 'svelte/store';
import { GamePhase } from '../../../../types/game.js';
import type { ClientGameState } from '../../../../types/game.js';

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

