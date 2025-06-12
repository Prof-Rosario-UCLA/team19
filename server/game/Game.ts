import { 
    GameState, 
    Player, 
    Card,
    Suit,
    Rank,
    ClientGameState
} from '../../types/types.js';
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
    WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
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
        this.maxScore = maxScore;

        if (playerIds.length === 0 || playerNames.length === 0) {
            // Initialize with empty state when no players
            this.gameState = {
                players: [],
                deck: [],
                currentTrick: [],
                trickLeader: 0,
                heartsBroken: false,
                scores: {},
                handNumber: 0,
                isFirstTrick: true,
                tricksPlayed: 0
            };
            this.currentPhase = GamePhase.WAITING_FOR_PLAYERS;
            this.currentPlayerIndex = -1;
            this.passingState = null;
            return;
        }

        // MODIFIED: Allow 1-4 players during waiting phase
        if (playerIds.length > 4 || playerNames.length > 4) {
            throw new Error('Hearts allows maximum 4 players');
        }

        // Initialize with current players
        this.gameState = initializeGame(playerIds, playerNames);
        this.passingState = null;

        // Only start the game when we have exactly 4 players
        if (playerIds.length === 4) {
            this.currentPhase = GamePhase.INITIALIZING;
            this.currentPlayerIndex = -1;
            this.startNewHand();
        } else {
            this.currentPhase = GamePhase.WAITING_FOR_PLAYERS;
            this.currentPlayerIndex = -1;
        }
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
        
        if (this.gameState.isFirstTrick) {
            // For first trick, find player with 2 of Clubs and set as trick leader
            const startingPlayer = findStartingPlayer(this.gameState);
            this.currentPlayerIndex = startingPlayer;
            console.log('Starting first trick with player', startingPlayer);
        } else {
            // For subsequent tricks, use the previous trick's winner
            this.currentPlayerIndex = this.gameState.trickLeader;
        }
    }

    // Get the current game state (for external use)
    public getGameState(): GameState {
        return { ...this.gameState };
    }

    // Convert GameState to ClientGameState for a specific player
    public getClientGameState(playerIndex: number): ClientGameState {
        // Get basic game state info
        const clientState: ClientGameState = {
            players: this.gameState.players.map(player => ({
                id: player.id,
                name: player.name,
                cardCount: player.hand.length,
                score: player.score
            })),
            currentTrick: [...this.gameState.currentTrick],
            trickLeader: this.gameState.trickLeader,
            heartsBroken: this.gameState.heartsBroken,
            handNumber: this.gameState.handNumber,
            isFirstTrick: this.gameState.isFirstTrick,
            tricksPlayed: this.gameState.tricksPlayed,
            gamePhase: this.currentPhase,
            currentPlayerTurn: this.currentPlayerIndex
        };

        // Add player-specific information
        if (playerIndex >= 0 && playerIndex < this.gameState.players.length) {
            // Add the player's own hand
            clientState.myHand = [...this.gameState.players[playerIndex].hand];
            
            // Add valid moves if it's the player's turn
            if (this.currentPhase === GamePhase.PLAYING && playerIndex === this.currentPlayerIndex) {
                clientState.playableCards = this.getValidMoves(playerIndex);
            }
        }

        return clientState;
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
            console.log('Invalid phase or turn in Game.playCard:', {
                phase: this.currentPhase,
                currentPlayerIndex: this.currentPlayerIndex,
                playerIndex
            });
            return false;
        }

        // Get valid moves for the player
        const validMoves = this.getValidMoves(playerIndex);
        console.log('Valid moves in Game.playCard:', validMoves);

        // Check if the card is in valid moves
        const isValidMove = validMoves.some(
            validCard => validCard.suit === card.suit && validCard.rank === card.rank
        );

        if (!isValidMove) {
            console.log('Invalid move in Game.playCard - card not in valid moves');
            return false;
        }

        // Play the card
        const updatedGameState = playCard(this.gameState, playerIndex, card);
        if (!updatedGameState) {
            console.log('playCard function returned null');
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
        
        // First trick special case
        if (this.gameState.isFirstTrick) {
            // If leading the first trick, only 2 of clubs is playable
            if (this.gameState.currentTrick.length === 0) {
                return player.hand.filter(card => 
                    card.suit === Suit.CLUBS && card.rank === Rank.TWO
                );
            }
            // If not leading, can't play hearts or queen of spades
            return player.hand.filter(card => 
                card.suit !== Suit.HEARTS && 
                !(card.suit === Suit.SPADES && card.rank === Rank.QUEEN)
            );
        }

        // Regular trick logic
        if (this.gameState.currentTrick.length === 0) {
            // If leading a trick
            if (!this.gameState.heartsBroken) {
                // Can't lead with hearts unless hearts are broken
                // Unless player only has hearts left
                const hasOnlyHearts = player.hand.every(card => card.suit === Suit.HEARTS);
                return hasOnlyHearts ? player.hand : 
                    player.hand.filter(card => card.suit !== Suit.HEARTS);
            }
            // If hearts are broken, can lead with any card
            return player.hand;
        }

        // If not leading, must follow suit if possible
        const leadSuit = this.gameState.currentTrick[0].suit;
        const canFollowSuit = player.hand.some(card => card.suit === leadSuit);
        
        if (canFollowSuit) {
            return player.hand.filter(card => card.suit === leadSuit);
        }
        
        // If can't follow suit, can play any card
        return player.hand;
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