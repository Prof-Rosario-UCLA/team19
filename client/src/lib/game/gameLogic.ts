// CLIENT SIDE CHECKS FOR GAME LOGIC

import type { ClientGameState, Card } from '../../../../types/types.js';
import { GamePhase } from '../../../../types/types.js';

export function isPlayerTurn(gameState: ClientGameState, playerIndex: number): boolean {
    return gameState.currentPlayerTurn === playerIndex;
}

export function canPlayCard(
    card: Card,
    playerHand: Card[],
    currentTrick: Card[],
    heartsBroken: boolean,
    isFirstTrick: boolean
): boolean {
    // If leading a trick
    if (currentTrick.length === 0) {
        // Can't lead with Hearts unless Hearts are broken
        if (card.suit === 'HEARTS' && !heartsBroken) {
            // Unless player only has Hearts left
            return playerHand.every(c => c.suit === 'HEARTS');
        }
        return true;
    }

    // Must follow suit if possible
    const leadSuit = currentTrick[0].suit;
    if (playerHand.some(c => c.suit === leadSuit)) {
        return card.suit === leadSuit;
    }

    // Can play any card if can't follow suit
    return true;
}

export function getValidMoves(
    gameState: ClientGameState,
    playerIndex: number,
    playerHand: Card[]
): Card[] {
    if (!isPlayerTurn(gameState, playerIndex)) {
        return [];
    }

    return playerHand.filter(card => 
        canPlayCard(
            card,
            playerHand,
            gameState.currentTrick,
            gameState.heartsBroken,
            gameState.isFirstTrick
        )
    );
}

export function isPassingPhase(gameState: ClientGameState): boolean {
    return gameState.gamePhase === GamePhase.PASSING;
}

export function isPlayingPhase(gameState: ClientGameState): boolean {
    return gameState.gamePhase === GamePhase.PLAYING;
}

export function isGameOver(gameState: ClientGameState): boolean {
    return gameState.gamePhase === GamePhase.FINISHED;
}

export function getPassingDirection(handNumber: number): 'LEFT' | 'RIGHT' | 'ACROSS' | 'HOLD' {
    switch (handNumber % 4) {
        case 0: return 'LEFT';
        case 1: return 'RIGHT';
        case 2: return 'ACROSS';
        case 3: return 'HOLD';
        default: return 'HOLD';
    }
} 