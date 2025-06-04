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

// Basic player info that can be shared with all clients
export interface PlayerPublicInfo {
    id: string;
    name: string;
    score: number;
    cardCount: number; // Number of cards in hand, instead of actual cards
}

// Game phase to track current state of the game
export enum GamePhase {
    WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
    DEALING = 'DEALING',
    PLAYING = 'PLAYING',
    HAND_COMPLETE = 'HAND_COMPLETE',
    GAME_OVER = 'GAME_OVER'
}

// Client-side game state (what each player sees)
export interface ClientGameState {
    players: PlayerPublicInfo[];
    currentTrick: Card[];
    trickLeader: number;
    heartsBroken: boolean;
    handNumber: number;
    isFirstTrick: boolean;
    tricksPlayed: number;
    gamePhase: GamePhase;
    currentPlayerTurn: number;
    myHand?: Card[]; // Only the current player's cards
    playableCards?: Card[]; // Valid cards that can be played on their turn
}

// Socket event types for client-server communication
export enum GameEvent {
    GET_ROOMS = 'get_rooms',
    CREATE_ROOM = 'create_room',
    JOIN_ROOM = 'join_room',
    SELECT_PASSING_CARDS = 'select_passing_cards',
    PLAY_CARD = 'play_card',
    GAME_STATE_UPDATED = 'game_state_updated',
    ROOMS_UPDATED = 'rooms_updated',
    DISCONNECT = 'disconnect'
}

// corresponds to create_room socket event
export interface CreateRoomPayload {
    name: string;
}

// corresponds to join_room socket event
export interface JoinRoomPayload {
    roomId: string;
    playerName: string;
}

// corresponds to play_card socket event
export interface PlayCardPayload {
    roomId: string;
    card: Card;
}

// corresponds to select_passing_cards socket event
export interface SelectPassingCardsPayload {
    roomId: string;
    cards: Card[];
}

// corresponds to game_state_updated socket event
export interface GameStateUpdatePayload {
    gameState: ClientGameState;
    currentPhase: GamePhase;
    currentPlayerIndex: number;
}

// Server response types
// corresponds to create_room socket event callback
export interface RoomResponse {
    success: boolean;
    roomId?: string;
    error?: string;
}

// corresponds to play_card and select_passing_cards socket event callbacks
export interface GameActionResponse {
    success: boolean;
    error?: string;
}

// Room information type
export interface RoomInfo {
    id: string;
    name: string;
    playerCount: number;
    status: GamePhase;
} 