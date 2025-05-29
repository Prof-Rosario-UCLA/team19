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
    value: number; // Numeric value for scoring
}

// Player interface
export interface Player {
    id: string;
    name: string;
    hand: Card[];
    score: number;
}

// Game state interface
export interface GameState {
    players: Player[];
    deck: Card[];
    currentTrick: Card[];
    trickLeader: number; // Index of the player who led the current trick
    heartsBroken: boolean;
    scores: { [playerId: string]: number };
    handNumber: number; // Track the current hand number (0-based)
    isFirstTrick: boolean; // Track if this is the first trick of the hand
    tricksPlayed: number; // Track number of tricks played in current hand
}
