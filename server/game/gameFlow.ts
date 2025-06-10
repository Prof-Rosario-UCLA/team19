// This file contains validation functions for the game flow
// This includes logic for the passing, playing, and scoring phases


import { Card, Player, GameState, Suit, Rank } from '../../types/types.js';
import { createDeck, dealCards, sortHand, calculateTrickPoints, isValidPlay } from './Deck.js';

export enum PassingDirection {
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
    ACROSS = 'ACROSS',
    HOLD = 'HOLD'
}

export interface TrickWinner {
    playerIndex: number;
    points: number;
}

// Interface for tracking selected cards for passing
export interface PassingState {
    selectedCards: Map<number, Card[]>;
    direction: PassingDirection;
    isComplete: boolean;
}

// Initialize a new game state
export function initializeGame(playerIds: string[], playerNames: string[]): GameState {
    if (playerIds.length !== 4 || playerNames.length !== 4) {
        throw new Error('Hearts requires exactly 4 players');
    }
    
    return {
        players: playerIds.map((id, index) => ({
            id,
            name: playerNames[index],
            hand: [],
            score: 0
        })),
        deck: [],
        currentTrick: [],
        trickLeader: 0,
        heartsBroken: false,
        scores: Object.fromEntries(playerIds.map(id => [id, 0])),
        handNumber: 0,
        isFirstTrick: true,
        tricksPlayed: 0
    };
}

// Deal cards to all players and sort their hands
export function dealNewHand(gameState: GameState): GameState {
    const deck = createDeck();
    const hands = dealCards(deck);
    
    // Update each player's hand with sorted cards
    gameState.players.forEach((player, index) => {
        player.hand = sortHand(hands[index]);
    });
    
    gameState.deck = deck;
    gameState.currentTrick = [];
    gameState.heartsBroken = false;
    gameState.isFirstTrick = true;
    gameState.tricksPlayed = 0;
    
    return gameState;
}

// Determine passing direction based on hand number (0-based)
export function getPassingDirection(handNumber: number): PassingDirection {
    switch (handNumber % 4) {
        case 0: return PassingDirection.LEFT;
        case 1: return PassingDirection.RIGHT;
        case 2: return PassingDirection.ACROSS;
        case 3: return PassingDirection.HOLD;
    }
    return PassingDirection.HOLD; // Default case
}

// Initialize the passing state for a new hand
export function initializePassingState(handNumber: number): PassingState {
    return {
        selectedCards: new Map(),
        direction: getPassingDirection(handNumber),
        isComplete: false
    };
}

// Validate cards selected for passing (3 cards per player, and they must be in the player's hand)
export function validatePassingCards(cards: Card[], playerHand: Card[]): boolean {
    if (cards.length !== 3) {
        return false;
    }

    return cards.every(card =>
        playerHand.some(handCard =>
            handCard.suit === card.suit && handCard.rank === card.rank
        )
    );
}

// Select cards for passing
export function selectCardsForPassing(
    gameState: GameState,
    passingState: PassingState,
    playerIndex: number,
    cards: Card[]
): PassingState | null {
    if (passingState.direction === PassingDirection.HOLD) {
        return null;
    }

    // Validate the cards
    if (!validatePassingCards(cards, gameState.players[playerIndex].hand)) {
        return null;
    }

    // Update the passing state with the selected cards
    const newPassingState = {
        ...passingState,
        selectedCards: new Map(passingState.selectedCards)
    };
    newPassingState.selectedCards.set(playerIndex, [...cards]);

    // Check if all players have selected their cards
    newPassingState.isComplete = newPassingState.selectedCards.size === 4 &&
        Array.from(newPassingState.selectedCards.values()).every(cards => cards.length === 3);

    return newPassingState;
}

// Execute the passing of cards once all players have selected
export function executePassingPhase(
    gameState: GameState,
    passingState: PassingState
): GameState | null {
    // Validate that we can pass cards
    if (passingState.direction === PassingDirection.HOLD) {
        return gameState;
    }

    // Validate that all players have selected exactly 3 cards
    if (!passingState.isComplete) {
        return null;
    }

    const numPlayers = gameState.players.length;
    const offset = passingState.direction === PassingDirection.LEFT ? 1 :
                  passingState.direction === PassingDirection.RIGHT ? numPlayers - 1 :
                  passingState.direction === PassingDirection.ACROSS ? 2 : 0;

    // Create new hands for each player
    const newHands: Card[][] = gameState.players.map((player, fromIdx) => {
        // Get the cards that weren't passed
        const remainingCards = player.hand.filter(card =>
            !passingState.selectedCards.get(fromIdx)?.some(passedCard =>
                passedCard.suit === card.suit && passedCard.rank === card.rank
            )
        );

        // Calculate which player is passing to this player
        const fromPlayerIdx = (fromIdx - offset + numPlayers) % numPlayers;
        const receivedCards = passingState.selectedCards.get(fromPlayerIdx) || [];

        return [...remainingCards, ...receivedCards];
    });

    // Validate that all new hands have exactly 13 cards
    if (newHands.some(hand => hand.length !== 13)) {
        return null;
    }

    // Update and sort each player's hand
    gameState.players.forEach((player, index) => {
        player.hand = sortHand(newHands[index]);
    });

    return gameState;
}

// Check if a player has completed their card selection for passing
// We probably need some sort of listener to check if all players have selected their cards
export function hasPlayerSelectedPassingCards(
    passingState: PassingState,
    playerIndex: number
): boolean {
    const selectedCards = passingState.selectedCards.get(playerIndex);
    return selectedCards !== undefined && selectedCards.length === 3;
}

// Get the number of players who have selected their passing cards
export function getPlayersReadyToPass(passingState: PassingState): number {
    return Array.from(passingState.selectedCards.values())
        .filter(cards => cards.length === 3)
        .length;
}

// Find the player with the Two of Clubs
export function findStartingPlayer(gameState: GameState): number {
    return gameState.players.findIndex(player =>
        player.hand.some(card =>
            card.suit === Suit.CLUBS && card.rank === Rank.TWO
        )
    );
}

// Play a card in the current trick
export function playCard(
    gameState: GameState,
    playerIndex: number,
    card: Card
): GameState | null {
    const player = gameState.players[playerIndex];
    
    // Validate the play
    if (!isValidPlay(
        card,
        player.hand,
        gameState.currentTrick,
        gameState.heartsBroken,
        gameState.isFirstTrick
    )) {
        return null; // Invalid play
    }
    
    // Remove the card from player's hand
    player.hand = player.hand.filter(c => 
        !(c.suit === card.suit && c.rank === card.rank)
    );
    
    // Add the card to the current trick
    gameState.currentTrick.push(card);
    
    // Check if Hearts has been broken
    if (card.suit === Suit.HEARTS) {
        gameState.heartsBroken = true;
    }
    
    return gameState;
}

// Determine the winner of a trick
export function determineTrickWinner(trick: Card[]): TrickWinner {
    if (trick.length === 0) return { playerIndex: 0, points: 0 };

    const leadSuit = trick[0].suit;
    let highestValue = -1;
    let winningIndex = 0;
    
    trick.forEach((card, index) => {
        if (card.suit === leadSuit && card.value > highestValue) {
            highestValue = card.value;
            winningIndex = index;
        }
    });
    
    return {
        playerIndex: winningIndex,
        points: calculateTrickPoints(trick)
    };
}

// Reset the trick state and update game state after a trick is complete
export function finishTrick(gameState: GameState): GameState {
    const winner = determineTrickWinner(gameState.currentTrick);
    
    // Update trick leader for next trick
    gameState.trickLeader = winner.playerIndex;
    
    // Add points to the winner's score
    gameState.players[winner.playerIndex].score += winner.points;
    
    // Clear the current trick
    gameState.currentTrick = [];
    
    // Update tricks played and first trick status
    gameState.tricksPlayed++;
    gameState.isFirstTrick = false;
    
    return gameState;
}

// Check if the hand is complete (13 tricks played)
export function isHandComplete(gameState: GameState): boolean {
    return gameState.tricksPlayed === 13;
}

// Start a new hand
export function startNewHand(gameState: GameState): GameState {
    gameState.handNumber++;
    return dealNewHand(gameState);
}

// Calculate scores for the hand and check for shooting the moon
export function scoreHand(gameState: GameState): GameState {
    const handScores = gameState.players.map(player => ({
        playerId: player.id,
        points: 0
    }));
    
    // Calculate total points for the hand
    let totalPoints = 0;
    gameState.players.forEach((player, index) => {
        const points = player.score;
        handScores[index].points = points;
        totalPoints += points;
    });
    
    // Check for shooting the moon
    const moonShooter = handScores.find(score => score.points === 26);
    if (moonShooter) {
        // If someone shot the moon, they get 0 and everyone else gets 26
        handScores.forEach(score => {
            if (score.playerId === moonShooter.playerId) {
                score.points = 0;
            } else {
                score.points = 26;
            }
        });
    }
    
    // Update game scores
    handScores.forEach(score => {
        gameState.scores[score.playerId] += score.points;
    });
    
    return gameState;
}

// Check if the game is over (someone has reached or exceeded 50 points)
export function isGameOver(gameState: GameState, maxScore: number): boolean {
    return Object.values(gameState.scores).some(score => score >= maxScore);
}

// Get the winner of the game
export function getGameWinner(gameState: GameState): string {
    const [winnerId] = Object.entries(gameState.scores)
        .reduce(([minId, minScore], [id, score]) => 
            score < minScore ? [id, score] : [minId, minScore],
            ['', Infinity]
        );
    return winnerId;
}

// Validate that a player can play a specific card
export function canPlayCard(
    gameState: GameState,
    playerIndex: number,
    card: Card
): boolean {
    const player = gameState.players[playerIndex];
    
    // Check if it's the player's turn
    const currentPlayerIndex = (gameState.trickLeader + gameState.currentTrick.length) % 4;
    if (playerIndex !== currentPlayerIndex) {
        return false;
    }
    
    // Check if the player has the card
    if (!player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) {
        return false;
    }
    
    // Check if the play is valid according to Hearts rules
    return isValidPlay(
        card,
        player.hand,
        gameState.currentTrick,
        gameState.heartsBroken,
        gameState.isFirstTrick
    );
} 