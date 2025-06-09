import { writable } from 'svelte/store';
import {GamePhase} from '../../../types/game.js';
import type { ClientGameState } from '../../../types/game.js';
import { io, Socket } from 'socket.io-client';

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


