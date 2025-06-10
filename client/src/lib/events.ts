import type { Card } from '../../../types/game';

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