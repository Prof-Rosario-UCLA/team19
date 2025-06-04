// Card suits enum
export enum Suit {
    HEARTS = 'HEARTS',
    DIAMONDS = 'DIAMONDS',
    CLUBS = 'CLUBS',
    SPADES = 'SPADES'
}

// Card ranks enum (2-10, J, Q, K, A)
export enum Rank {
    TWO = '2',
    THREE = '3',
    FOUR = '4',
    FIVE = '5',
    SIX = '6',
    SEVEN = '7',
    EIGHT = '8',
    NINE = '9',
    TEN = '10',
    JACK = 'J',
    QUEEN = 'Q',
    KING = 'K',
    ACE = 'A'
}

// Card interface
export interface Card {
    suit: Suit;
    rank: Rank;
    value: number;
}

// Basic player info visible to all clients
export interface PlayerPublicInfo {
    id: string;
    name: string;
    score: number;
    cardCount: number; // Number of cards in hand, visible to other players
}

// Game phase enum
export enum GamePhase {
    WAITING = 'WAITING',
    PASSING = 'PASSING',
    PLAYING = 'PLAYING',
    ROUND_END = 'ROUND_END',
    GAME_END = 'GAME_END'
}

// Client-side game state (what each player sees)
export interface ClientGameState {
    players: PlayerPublicInfo[];
    currentTrick: Card[];
    trickLeader: number;
    currentPlayer: number;
    gamePhase: GamePhase;
    heartsBroken: boolean;
    handNumber: number;
    tricksPlayed: number;
    myHand?: Card[]; // Only the current player's cards
    playableCards?: Card[]; // Valid cards that can be played
    scores: { [playerId: string]: number };
}

// Socket event types
export enum GameEvent {
    JOIN_GAME = 'JOIN_GAME',
    GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
    PLAY_CARD = 'PLAY_CARD',
    PASS_CARDS = 'PASS_CARDS',
    ERROR = 'ERROR'
}

export interface PlayCardPayload {
    playerId: string;
    card: Card;
}

export interface PassCardsPayload {
    playerId: string;
    cards: Card[];
}

export enum PassingDirection {
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    ACROSS = 'ACROSS',
    HOLD = 'HOLD'
}

// Socket event types
export interface CreateRoomEvent {
    name: string;
}

export interface JoinRoomEvent {
    roomId: string;
    playerName: string;
}

export interface SelectPassingCardsEvent {
    roomId: string;
    cards: Card[];
}

// Server response types
export interface RoomResponse {
    success: boolean;
    roomId?: string;
    error?: string;
}

export interface GameActionResponse {
    success: boolean;
    error?: string;
} 