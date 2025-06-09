// lib/types.ts
export type CardType = {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: number | "J" | "Q" | "K" | "A";
};

export type PlayerType = {
  name: string;
  isHuman: boolean;
  hand: CardType[];
  score: number;
};

export type GameState = {
  roundNumber: number;
  passingDirection: "left" | "right" | "across" | "none";
  currentPlayerIndex: number;
  players: string[];
  hands: { [player: string]: CardType[] };
  scores: { [player: string]: number };
  roundScores: { [player: string]: number };
  currentTrick: { player: string, card: CardType }[];
  trickWinner: string | null;
  heartsBroken: boolean;
  passingPhase: boolean;
  gameStarted: boolean;
  gameOver: boolean;
};

// Event types for component communication
export interface CardPlayEvent {
  player: string;
  card: CardType;
}

export interface PassingEvent {
  player: string;
  cards: CardType[];
}

export interface ReadyToPassEvent {
  player: string;
  ready: boolean;
  selectedCards: CardType[];
}