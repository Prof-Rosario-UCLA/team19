// src/lib/stores/socket.ts

import { io, type Socket } from 'socket.io-client';
import { writable, get, derived } from 'svelte/store';
import type { CardType, PlayerType, GameState, RoomInfo } from '../types';

// Helper function to normalize card data from server format to frontend format
function normalizeCards(cards: any[]): CardType[] {
    if (!cards || !Array.isArray(cards)) return [];

    return cards.map((card, index) => {
        // Debug logging for each card
        console.log(`Normalizing card ${index}:`, card);

        if (!card || typeof card !== 'object') {
            console.warn(`Invalid card at index ${index}:`, card);
            return { suit: 'spades', rank: 2 };
        }

        const normalizedCard = {
            suit: (card.suit || 'SPADES').toLowerCase() as "hearts" | "diamonds" | "clubs" | "spades",
            rank: card.rank
        };

        console.log(`Normalized card ${index}:`, normalizedCard);
        return normalizedCard;
    });
}

// ------- STORES -------

export const socket = writable<Socket | null>(null);
export const connectionStatus = writable<'disconnected'|'connecting'|'connected'>('disconnected');
export const rooms = writable<RoomInfo[]>([]);
export const gameState = writable<GameState | null>(null);
export const players = writable<PlayerType[]>([]);
export const currentRoomId = writable<string | null>(null);
export const currentRoomName = writable<string>('');
export const selfPlayerName = writable<string>('');
export const error = writable<string | null>(null);

// Waiting room specific stores
export const inWaitingRoom = writable<boolean>(false);
export const roomPlayerCount = writable<number>(1);
export const gameStarting = writable<boolean>(false);

// Store for the current player's index (sent by server)
export const myPlayerIndex = writable<number | null>(null);

// Store for all player names in order
export const allPlayerNames = writable<string[]>([]);

// Store for raw game state from server
export const rawGameState = writable<any>(null);

// ------- SOCKET CONNECTION -------

export function connectSocket(url?: string) {
    if (get(socket)) return; // Already connected

    connectionStatus.set('connecting');

    // Auto-detect URL based on environment
    const isDevelopment = import.meta.env?.VITE_DEV_MODE === 'true';
    const socketUrl = url || (isDevelopment ? 'http://localhost:3000' : window.location.origin);

    console.log('Connecting to:', socketUrl);

    const s = io(socketUrl, {
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 10000
    });
    socket.set(s);

    s.on('connect', () => {
        connectionStatus.set('connected');
        error.set(null);
        console.log('Connected to server');
        getRooms();
    });

    s.on('disconnect', () => {
        connectionStatus.set('disconnected');
        rooms.set([]);
        resetGameState();
        error.set('Disconnected from server.');
        console.log('Disconnected from server');
    });

    s.on('connect_error', (err) => {
        connectionStatus.set('disconnected');
        const serverUrl = isDevelopment ? 'localhost:3000' : 'the server';
        error.set(`Could not connect to server. Make sure the server is running on ${serverUrl}`);
        console.error('Connection error:', err);
    });

    // -------- SOCKET EVENTS --------
    s.on('rooms_updated', (roomList) => {
        console.log('Rooms updated:', roomList);
        rooms.set(roomList);

        // Update current room player count if we're in a room
        const currentId = get(currentRoomId);
        if (currentId) {
            const currentRoom = roomList.find(r => r.id === currentId);
            if (currentRoom) {
                console.log('Updating room player count:', currentRoom.playerCount);
                roomPlayerCount.set(currentRoom.playerCount);
            }
        }
    });

    s.on('room_state_updated', (data) => {
        console.log('Room state updated:', data);
        if (data.roomId === get(currentRoomId)) {
            if (data.players) {
                console.log('Setting players from room_state_updated:', data.players);

                // During waiting phase, just track basic player info
                const roomPlayers = data.players.map((player: any, index: number) => ({
                    name: player.name || player.username || `Player ${index + 1}`,
                    hand: [],
                    score: 0,
                    isHuman: true
                }));

                players.set(roomPlayers);
                roomPlayerCount.set(data.players.length);

                // Also store the player names separately
                const playerNames = data.players.map((p: any) => p.name || p.username || 'Unknown');
                allPlayerNames.set(playerNames);
            }
        }
    });

    s.on('game_state_updated', (data) => {
        console.log('Game state updated:', data);

        // Your server sends: { gameState: {...}, currentPhase: '...', currentPlayerIndex: ... }
        let actualGameState = data.gameState || data;
        let currentPhase = data.currentPhase;
        let serverCurrentPlayerIndex = data.currentPlayerIndex;

        if (actualGameState) {
            console.log('Raw game state from server:', actualGameState);
            console.log('myHand from server:', actualGameState.myHand);
            console.log('Players from server:', actualGameState.players);
            rawGameState.set(actualGameState);

            // Extract player information
            if (actualGameState.players && Array.isArray(actualGameState.players)) {
                const playerNames = actualGameState.players.map((p: any) => p.name || p.username || 'Unknown');
                console.log('Extracted player names:', playerNames);
                allPlayerNames.set(playerNames);

                // Find my player index based on my name
                const myName = get(selfPlayerName);
                const myIndex = playerNames.findIndex((name: string) => name === myName);
                console.log('My name:', myName, 'My index:', myIndex);
                myPlayerIndex.set(myIndex >= 0 ? myIndex : null);

                // Only create rotated players if we found our index
                if (myIndex >= 0) {
                    // Create rotated player array where "I" am always at index 0 (south position)
                    const rotatedPlayers = [];
                    const totalPlayers = playerNames.length;

                    for (let i = 0; i < 4; i++) {
                        const actualIndex = (myIndex + i) % totalPlayers;
                        if (actualIndex < totalPlayers && actualGameState.players[actualIndex]) {
                            const player = actualGameState.players[actualIndex];
                            rotatedPlayers.push({
                                name: player.name || player.username || `Player ${actualIndex + 1}`,
                                // IMPORTANT: Only give hand data to myself (index 0 in rotated array)
                                // Also normalize the card data from server format to frontend format
                                hand: i === 0 ? (() => {
                                    const originalHand = actualGameState.myHand || player.hand || [];
                                    console.log('Original hand before normalization:', originalHand);
                                    const normalizedHand = normalizeCards(originalHand);
                                    console.log('Normalized hand after conversion:', normalizedHand);
                                    return normalizedHand;
                                })() : [],
                                score: player.score || 0,
                                isHuman: true
                            });
                        } else {
                            rotatedPlayers.push({
                                name: `Player ${i + 1}`,
                                hand: [],
                                score: 0,
                                isHuman: false
                            });
                        }
                    }

                    console.log('Rotated players (me at index 0):', rotatedPlayers);
                    console.log('My hand data:', actualGameState.myHand);
                    players.set(rotatedPlayers);
                } else {
                    // Fallback: just use the players as-is if we can't find our index
                    const formattedPlayers = actualGameState.players.map((player: any, index: number) => ({
                        name: player.name || player.username || `Player ${index + 1}`,
                        // Only show hand for the first player (assumed to be me)
                        // Also normalize the card data from server format to frontend format
                        hand: index === 0 ? normalizeCards(actualGameState.myHand || player.hand || []) : [],
                        score: player.score || 0,
                        isHuman: true
                    }));
                    console.log('Using non-rotated players (could not find my index):', formattedPlayers);
                    console.log('My hand data (fallback):', actualGameState.myHand);
                    players.set(formattedPlayers);
                }

                roomPlayerCount.set(playerNames.length);

                // Calculate rotated current player index
                const rotatedCurrentPlayerIndex = (myIndex >= 0 && serverCurrentPlayerIndex !== undefined) ?
                    (serverCurrentPlayerIndex - myIndex + 4) % 4 :
                    serverCurrentPlayerIndex;

                // Enhance game state with server data
                const enhancedGameState = {
                    ...actualGameState,
                    currentPhase: currentPhase,
                    currentPlayerIndex: serverCurrentPlayerIndex,
                    // Map server phases to our expected format
                    passingPhase: currentPhase === 'PASSING',
                    gameStarted: currentPhase !== 'WAITING_FOR_PLAYERS',
                    gameOver: currentPhase === 'GAME_OVER',

                    // Rotate current player index relative to me
                    rotatedCurrentPlayerIndex: rotatedCurrentPlayerIndex
                };

                console.log('Enhanced game state:', enhancedGameState);
                gameState.set(enhancedGameState);
            }
        }

        // Handle phase transitions
        if (currentPhase === 'PASSING' && get(inWaitingRoom)) {
            console.log('Game started, exiting waiting room');
            inWaitingRoom.set(false);
            gameStarting.set(false);
        } else if (currentPhase === 'WAITING_FOR_PLAYERS') {
            console.log('Still in waiting phase, ensuring waiting room state');
            inWaitingRoom.set(true);
            gameStarting.set(false);
        }

        // JANK FIX: Force game start if flag is set
        if (actualGameState?.forceGameStart && get(inWaitingRoom)) {
            console.log('JANK FIX: Force starting game due to forceGameStart flag');
            inWaitingRoom.set(false);
            gameStarting.set(false);
        }
    });

    s.on('game_started', (data) => {
        console.log('Game started:', data);
        gameStarting.set(true);

        setTimeout(() => {
            inWaitingRoom.set(false);
            gameState.set(data.gameState);
            players.set(data.players);
            currentRoomId.set(data.roomId);
        }, 1000);
    });

    s.on('cards_dealt', (data) => {
        console.log('Cards dealt:', data);
        if (data.hands) {
            const currentGameState = get(gameState);
            if (currentGameState) {
                gameState.set({
                    ...currentGameState,
                    hands: data.hands
                });
            }
        }
    });

    s.on('card_played', (data) => {
        console.log('Card played:', data);
        const currentGameState = get(gameState);
        if (currentGameState) {
            gameState.set({
                ...currentGameState,
                currentTrick: data.currentTrick,
                currentPlayerIndex: data.currentPlayerIndex
            });
        }
    });

    s.on('trick_completed', (data) => {
        console.log('Trick completed:', data);
        const currentGameState = get(gameState);
        if (currentGameState) {
            gameState.set({
                ...currentGameState,
                trickWinner: data.winner
            });

            setTimeout(() => {
                gameState.set({
                    ...get(gameState)!,
                    trickWinner: null,
                    currentTrick: [],
                    currentPlayerIndex: data.nextPlayerIndex
                });
            }, 2000);
        }
    });

    s.on('round_ended', (data) => {
        console.log('Round ended:', data);
        const currentGameState = get(gameState);
        if (currentGameState) {
            gameState.set({
                ...currentGameState,
                scores: data.scores,
                roundScores: data.roundScores,
                gameOver: data.gameOver || false,
                roundNumber: data.nextRound || currentGameState.roundNumber + 1
            });
        }
    });

    s.on('cards_passed', (data) => {
        console.log('Cards passed:', data);
        const currentGameState = get(gameState);
        if (currentGameState) {
            gameState.set({
                ...currentGameState,
                hands: data.hands,
                passingPhase: false
            });
        }
    });

    s.on('game_over', (data) => {
        console.log('Game over:', data);
        const currentGameState = get(gameState);
        if (currentGameState) {
            gameState.set({
                ...currentGameState,
                gameOver: true,
                scores: data.finalScores || currentGameState.scores
            });
        }
    });

    s.on('player_joined', (data) => {
        console.log('Player joined:', data);
    });

    s.on('player_left', (data) => {
        console.log('Player left:', data);
        gameStarting.set(false);
    });

    s.on('error', (msg) => {
        console.error('Socket error:', msg);
        error.set(msg);
    });
}

// ------- DISCONNECT -------

export function disconnectSocket() {
    const s = get(socket);
    if (s) {
        s.disconnect();
    }
    resetAllStores();
}

function resetGameState() {
    gameState.set(null);
    players.set([]);
    currentRoomId.set(null);
    currentRoomName.set('');
    inWaitingRoom.set(false);
    roomPlayerCount.set(1);
    gameStarting.set(false);
}

function resetAllStores() {
    socket.set(null);
    connectionStatus.set('disconnected');
    rooms.set([]);
    resetGameState();
    selfPlayerName.set('');
    error.set(null);
}

// ------- ROOMS -------

export function createRoom(roomName: string, hostUser?: any, cb?: (response: any) => void) {
    const s = get(socket);
    if (!s) {
        error.set('Not connected to server');
        return;
    }

    const createData = {
        name: roomName,
        ...(hostUser ? { hostUser } : {})
    };

    s.emit('create_room', createData, (resp) => {
        console.log('Create room response:', resp);
        if (resp.success) {
            console.log('Room created:', resp);
            currentRoomName.set(roomName);
            // Note: currentRoomId will be set when we join the room
            if (cb) cb(resp);
        } else {
            error.set(resp.error || 'Failed to create room');
            if (cb) cb(resp);
        }
    });
}

export function joinRoom(roomId: string, playerName: string, user?: any, cb?: (response: any) => void) {
    const s = get(socket);
    if (!s) {
        error.set('Not connected to server');
        return;
    }

    selfPlayerName.set(playerName);

    const joinData = {
        roomId,
        playerName,
        ...(user ? { user } : {})
    };

    console.log('Joining room with data:', joinData);

    s.emit('join_room', joinData, (resp) => {
        console.log('Join room response:', resp);
        if (resp.success) {
            console.log('Joined room successfully:', resp);
            currentRoomId.set(roomId);
            inWaitingRoom.set(true);
            gameStarting.set(false);

            // Server will send game_state_updated event separately with player data
            if (cb) cb(resp);
        } else {
            error.set(resp.error || 'Failed to join room');
            if (cb) cb(resp);
        }
    });
}

export function leaveRoom(user?: any, cb?: (response: any) => void) {
    const s = get(socket);
    const roomId = get(currentRoomId);
    if (!s || !roomId) return;

    const leaveData = {
        roomId,
        ...(user ? { user } : {})
    };

    s.emit('leave_room', leaveData, (resp) => {
        console.log('Left room:', resp);
        resetGameState();
        if (cb) cb(resp);
    });
}

export function getRooms(cb?: (rooms: RoomInfo[]) => void) {
    const s = get(socket);
    if (!s) return;

    s.emit('get_rooms', (roomList) => {
        console.log('Retrieved rooms:', roomList);
        rooms.set(roomList);
        if (cb) cb(roomList);
    });
}

// ------- GAME ACTIONS -------

export function playCard(card: CardType, cb?: (response: any) => void) {
    const s = get(socket);
    const roomId = get(currentRoomId);

    if (!s || !roomId) {
        error.set('Missing connection or room info');
        return;
    }

    // Convert card to server format (uppercase suit, add value)
    const serverCard = {
        suit: card.suit.toUpperCase(),
        rank: card.rank.toString(), // Ensure rank is string
        value: typeof card.rank === 'number' ? card.rank :
            card.rank === 'J' ? 11 : card.rank === 'Q' ? 12 :
                card.rank === 'K' ? 13 : card.rank === 'A' ? 14 : parseInt(card.rank.toString())
    };

    console.log('Sending card to server:', serverCard);

    // Your server expects: play_card with { roomId, card }
    s.emit('play_card', { roomId, card: serverCard }, (resp) => {
        if (!resp.success && resp.error) {
            error.set(resp.error);
            console.error('Failed to play card:', resp.error);
        }
        if (cb) cb(resp);
    });
}

export function passCards(cards: CardType[], cb?: (response: any) => void) {
    const s = get(socket);
    const roomId = get(currentRoomId);

    if (!s || !roomId) {
        error.set('Missing connection or room info');
        return;
    }

    // Convert cards to server format (uppercase suits)
    const serverCards = cards.map(card => ({
        suit: card.suit.toUpperCase(),
        rank: card.rank,
        value: typeof card.rank === 'number' ? card.rank :
            card.rank === 'J' ? 11 : card.rank === 'Q' ? 12 :
                card.rank === 'K' ? 13 : 14
    }));

    console.log('Sending cards to server:', serverCards);

    // Your server expects: select_passing_cards with { roomId, cards }
    s.emit('select_passing_cards', { roomId, cards: serverCards }, (resp) => {
        if (!resp.success && resp.error) {
            error.set(resp.error);
        }
        if (cb) cb(resp);
    });
}

export function restartGame(cb?: (response: any) => void) {
    const s = get(socket);
    const roomId = get(currentRoomId);

    if (!s || !roomId) {
        error.set('Missing connection or room info');
        return;
    }

    s.emit('restart_game', { roomId }, (resp) => {
        if (!resp.success && resp.error) {
            error.set(resp.error);
        }
        if (cb) cb(resp);
    });
}

// ------- UTIL -------

export function getSelfPlayer(): PlayerType | undefined {
    const ps = get(players);
    const name = get(selfPlayerName);
    return ps.find(p => p.name === name);
}

// Create a derived store for isOnlineGame
export const isOnlineGame = derived(
    [socket, currentRoomId],
    ([$socket, $currentRoomId]) => {
        return !!($socket?.connected && $currentRoomId);
    }
);