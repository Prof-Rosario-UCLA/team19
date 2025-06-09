// lib/types.ts
import { Suit, Rank, Card, PlayerPublicInfo, GamePhase, ClientGameState, RoomInfo } from '../../../types/game';

// Re-export types to be used in the client
export type { Card, PlayerPublicInfo, GamePhase,ClientGameState, RoomInfo };

// Event types for component communication
export interface CardPlayEvent {
    card: Card;
}

export interface PassingEvent {
    cards: Card[];
}

export interface ReadyToPassEvent {
    ready: boolean;
    selectedCards: Card[];
}