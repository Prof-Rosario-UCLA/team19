import { 
    GameState, 
    Player, 
    Card,
    Suit,
    Rank
} from './types.js';
import {
    PassingState,
    PassingDirection,
    initializeGame,
    initializePassingState,
    selectCardsForPassing,
    executePassingPhase,
    playCard,
    finishTrick,
    isHandComplete,
    startNewHand,
    scoreHand,
    isGameOver,
    getGameWinner,
    findStartingPlayer,
    canPlayCard
} from './gameFlow.js';

export enum GamePhase {
    INITIALIZING = 'INITIALIZING',
    PASSING = 'PASSING',
    PLAYING = 'PLAYING',
    SCORING = 'SCORING',
    FINISHED = 'FINISHED'
}

export class Game {
    private gameState: GameState;
    private passingState: PassingState | null;
    private currentPhase: GamePhase;
    private currentPlayerIndex: number;
    private maxScore: number;

    constructor(playerIds: string[], playerNames: string[], maxScore: number = 100) {
        this.gameState = initializeGame(playerIds, playerNames);
        this.passingState = null;
        this.currentPhase = GamePhase.INITIALIZING;
        this.currentPlayerIndex = -1;
        this.maxScore = maxScore;
        this.startNewHand();
    }

    // Start a new hand
    private startNewHand(): void {
        this.gameState = startNewHand(this.gameState);
        
        // Initialize passing phase if needed
        if (this.gameState.handNumber % 4 !== 3) { // Not a "hold" hand
            this.currentPhase = GamePhase.PASSING;
            this.passingState = initializePassingState(this.gameState.handNumber);
        } else {
            this.startPlayingPhase();
        }
    }

    // Start the playing phase
    private startPlayingPhase(): void {
        this.currentPhase = GamePhase.PLAYING;
        this.currentPlayerIndex = this.gameState.isFirstTrick ? 
            findStartingPlayer(this.gameState) : // First trick starts with 2 of clubs
            this.gameState.trickLeader;
    }

    // Get the current game state (for external use)
    public getGameState(): GameState {
        return { ...this.gameState };
    }

    // Get the current game phase
    public getCurrentPhase(): GamePhase {
        return this.currentPhase;
    }

    // Get whose turn it is
    public getCurrentPlayerIndex(): number {
        return this.currentPlayerIndex;
    }

    // Select cards for passing
    public selectCardsForPassing(playerIndex: number, cards: Card[]): boolean {
        if (this.currentPhase !== GamePhase.PASSING || !this.passingState) {
            return false;
        }

        const updatedPassingState = selectCardsForPassing(
            this.gameState,
            this.passingState,
            playerIndex,
            cards
        );

        if (!updatedPassingState) {
            return false;
        }

        this.passingState = updatedPassingState;

        // If all players have selected their cards, execute the passing phase
        if (this.passingState.isComplete) {
            const updatedGameState = executePassingPhase(this.gameState, this.passingState);
            if (!updatedGameState) {
                return false;
            }

            this.gameState = updatedGameState;
            this.startPlayingPhase();
        }

        return true;
    }

    // Play a card
    public playCard(playerIndex: number, card: Card): boolean {
        // Validate that it's the playing phase and the correct player's turn
        if (this.currentPhase !== GamePhase.PLAYING || playerIndex !== this.currentPlayerIndex) {
            return false;
        }

        // Validate the play
        if (!canPlayCard(this.gameState, playerIndex, card)) {
            return false;
        }

        // Play the card
        const updatedGameState = playCard(this.gameState, playerIndex, card);
        if (!updatedGameState) {
            return false;
        }
        this.gameState = updatedGameState;

        // Check if the trick is complete (all 4 players played)
        if (this.gameState.currentTrick.length === 4) {
            this.gameState = finishTrick(this.gameState);
            
            // Check if the hand is complete
            if (isHandComplete(this.gameState)) {
                this.currentPhase = GamePhase.SCORING;
                this.scoreHand();
            } else {
                // Next player is the winner of the last trick
                this.currentPlayerIndex = this.gameState.trickLeader;
            }
        } else {
            // Next player's turn
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
        }

        return true;
    }

    // Score the current hand
    private scoreHand(): void {
        this.gameState = scoreHand(this.gameState);

        // Check if the game is over
        if (isGameOver(this.gameState, this.maxScore)) {
            this.currentPhase = GamePhase.FINISHED;
        } else {
            this.startNewHand();
        }
    }

    // Get the winner if the game is finished
    public getWinner(): string | null {
        if (this.currentPhase !== GamePhase.FINISHED) {
            return null;
        }
        return getGameWinner(this.gameState);
    }

    // Get valid moves for the current player
    public getValidMoves(playerIndex: number): Card[] {
        if (this.currentPhase !== GamePhase.PLAYING || playerIndex !== this.currentPlayerIndex) {
            return [];
        }

        const player = this.gameState.players[playerIndex];
        return player.hand.filter(card => 
            canPlayCard(this.gameState, playerIndex, card)
        );
    }

    // Get the current passing direction (if in passing phase)
    public getCurrentPassingDirection(): PassingDirection | null {
        return this.passingState?.direction || null;
    }

    // Check if a player has selected their passing cards
    public hasPlayerSelectedPassingCards(playerIndex: number): boolean {
        return this.passingState ? 
            this.passingState.selectedCards.has(playerIndex) : 
            false;
    }

    // Get the number of players who have selected their passing cards
    public getPlayersReadyToPass(): number {
        return this.passingState ? 
            Array.from(this.passingState.selectedCards.values()).length : 
            0;
    }
} 