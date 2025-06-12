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

export interface PassingState {
    selectedCards: Map<number, Card[]>;
    direction: PassingDirection;
    isComplete: boolean;
}

export function initializeGame(playerIds: string[], playerNames: string[]): GameState {
    if (playerIds.length !== playerNames.length) {
        throw new Error('Player IDs and names must match in length');
    }

    if (playerIds.length > 4) {
        throw new Error('Hearts allows maximum 4 players');
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

export function dealNewHand(gameState: GameState): GameState {
    const deck = createDeck();
    const hands = dealCards(deck);

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

export function getPassingDirection(handNumber: number): PassingDirection {
    switch (handNumber % 4) {
        case 0: return PassingDirection.LEFT;
        case 1: return PassingDirection.RIGHT;
        case 2: return PassingDirection.ACROSS;
        case 3: return PassingDirection.HOLD;
    }
    return PassingDirection.HOLD;
}

export function initializePassingState(handNumber: number): PassingState {
    return {
        selectedCards: new Map(),
        direction: getPassingDirection(handNumber),
        isComplete: false
    };
}

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

export function selectCardsForPassing(
    gameState: GameState,
    passingState: PassingState,
    playerIndex: number,
    cards: Card[]
): PassingState | null {
    if (passingState.direction === PassingDirection.HOLD) {
        return null;
    }

    if (!validatePassingCards(cards, gameState.players[playerIndex].hand)) {
        return null;
    }

    const newPassingState = {
        ...passingState,
        selectedCards: new Map(passingState.selectedCards)
    };
    newPassingState.selectedCards.set(playerIndex, [...cards]);

    newPassingState.isComplete = newPassingState.selectedCards.size === 4 &&
        Array.from(newPassingState.selectedCards.values()).every(cards => cards.length === 3);

    return newPassingState;
}

export function executePassingPhase(
    gameState: GameState,
    passingState: PassingState
): GameState | null {
    if (passingState.direction === PassingDirection.HOLD) {
        return gameState;
    }

    if (!passingState.isComplete) {
        return null;
    }

    const numPlayers = gameState.players.length;
    const offset = passingState.direction === PassingDirection.LEFT ? 1 :
        passingState.direction === PassingDirection.RIGHT ? numPlayers - 1 :
            passingState.direction === PassingDirection.ACROSS ? 2 : 0;

    const newHands: Card[][] = gameState.players.map((player, fromIdx) => {
        const remainingCards = player.hand.filter(card =>
            !passingState.selectedCards.get(fromIdx)?.some(passedCard =>
                passedCard.suit === card.suit && passedCard.rank === card.rank
            )
        );

        const fromPlayerIdx = (fromIdx - offset + numPlayers) % numPlayers;
        const receivedCards = passingState.selectedCards.get(fromPlayerIdx) || [];

        return [...remainingCards, ...receivedCards];
    });

    if (newHands.some(hand => hand.length !== 13)) {
        return null;
    }

    gameState.players.forEach((player, index) => {
        player.hand = sortHand(newHands[index]);
    });

    return gameState;
}

export function hasPlayerSelectedPassingCards(
    passingState: PassingState,
    playerIndex: number
): boolean {
    const selectedCards = passingState.selectedCards.get(playerIndex);
    return selectedCards !== undefined && selectedCards.length === 3;
}

export function getPlayersReadyToPass(passingState: PassingState): number {
    return Array.from(passingState.selectedCards.values())
        .filter(cards => cards.length === 3)
        .length;
}

export function findStartingPlayer(gameState: GameState): number {
    const startingPlayerIndex = gameState.players.findIndex(player =>
        player.hand.some(card =>
            card.suit === Suit.CLUBS && card.rank === Rank.TWO
        )
    );

    if (startingPlayerIndex === -1) {
        console.error('Could not find player with 2 of Clubs');
        return 0;
    }

    gameState.trickLeader = startingPlayerIndex;
    console.log(`Found starting player ${startingPlayerIndex} with 2 of Clubs, set as trick leader`);

    return startingPlayerIndex;
}

export function startPlayingPhase(gameState: GameState): GameState {
    if (gameState.isFirstTrick) {
        const startingPlayer = findStartingPlayer(gameState);
        console.log('Starting first trick with player', startingPlayer);
    }

    return gameState;
}

export function playCard(
    gameState: GameState,
    playerIndex: number,
    card: Card
): GameState | null {
    console.log('gameFlow.playCard called with:', {
        playerIndex,
        card,
        currentTrick: gameState.currentTrick,
        isFirstTrick: gameState.isFirstTrick,
        heartsBroken: gameState.heartsBroken
    });

    const player = gameState.players[playerIndex];

    if (!isValidPlay(
        card,
        player.hand,
        gameState.currentTrick,
        gameState.heartsBroken,
        gameState.isFirstTrick
    )) {
        console.log('Invalid play in gameFlow.playCard');
        return null;
    }

    player.hand = player.hand.filter(c =>
        !(c.suit === card.suit && c.rank === card.rank)
    );

    gameState.currentTrick.push(card);

    if (card.suit === Suit.HEARTS) {
        gameState.heartsBroken = true;
    }

    return gameState;
}

export function determineTrickWinner(trick: Card[], trickLeader: number): TrickWinner {
    if (trick.length === 0) return { playerIndex: trickLeader, points: 0 };

    const leadSuit = trick[0].suit;
    let highestValue = -1;
    let winningTrickIndex = 0;

    console.log('Determining trick winner:', {
        trick: trick.map(card => `${card.rank}${card.suit.charAt(0)}`),
        leadSuit,
        trickLeader
    });

    trick.forEach((card, trickIndex) => {
        if (card.suit === leadSuit) {
            console.log(`Card ${card.rank}${card.suit.charAt(0)} is of lead suit, value: ${card.value}`);
            if (card.value > highestValue) {
                highestValue = card.value;
                winningTrickIndex = trickIndex;
                console.log(`New winning card: ${card.rank}${card.suit.charAt(0)} at trick index ${trickIndex}`);
            }
        } else {
            console.log(`Card ${card.rank}${card.suit.charAt(0)} is not of lead suit, ignoring`);
        }
    });

    const winningPlayerIndex = (trickLeader + winningTrickIndex) % 4;

    const points = calculateTrickPoints(trick);
    console.log(`Trick winner: player ${winningPlayerIndex} (trick index ${winningTrickIndex}) with ${points} points`);

    return {
        playerIndex: winningPlayerIndex,
        points
    };
}

export function finishTrick(gameState: GameState): GameState {
    const winner = determineTrickWinner(gameState.currentTrick, gameState.trickLeader);

    console.log('Finishing trick:', {
        trick: gameState.currentTrick.map(card => `${card.rank}${card.suit.charAt(0)}`),
        trickLeader: gameState.trickLeader,
        winner: winner.playerIndex,
        points: winner.points
    });

    gameState.trickLeader = winner.playerIndex;
    gameState.players[winner.playerIndex].score += winner.points;
    gameState.currentTrick = [];
    gameState.tricksPlayed++;
    gameState.isFirstTrick = false;

    console.log('Updated game state after trick:', {
        trickLeader: gameState.trickLeader,
        playerScores: gameState.players.map(p => p.score),
        tricksPlayed: gameState.tricksPlayed
    });

    return gameState;
}

export function isHandComplete(gameState: GameState): boolean {
    return gameState.tricksPlayed === 13;
}

export function startNewHand(gameState: GameState): GameState {
    gameState.handNumber++;
    return dealNewHand(gameState);
}

export function scoreHand(gameState: GameState): GameState {
    const handScores = gameState.players.map(player => ({
        playerId: player.id,
        points: 0
    }));

    let totalPoints = 0;
    gameState.players.forEach((player, index) => {
        const points = player.score;
        handScores[index].points = points;
        totalPoints += points;
    });

    const moonShooter = handScores.find(score => score.points === 26);
    if (moonShooter) {
        handScores.forEach(score => {
            if (score.playerId === moonShooter.playerId) {
                score.points = 0;
            } else {
                score.points = 26;
            }
        });
    }

    handScores.forEach(score => {
        gameState.scores[score.playerId] += score.points;
    });

    return gameState;
}

export function isGameOver(gameState: GameState, maxScore: number): boolean {
    return Object.values(gameState.scores).some(score => score >= maxScore);
}

export function getGameWinner(gameState: GameState): string {
    const [winnerId] = Object.entries(gameState.scores)
        .reduce(([minId, minScore], [id, score]) =>
                score < minScore ? [id, score] : [minId, minScore],
            ['', Infinity]
        );
    return winnerId;
}

export function canPlayCard(
    gameState: GameState,
    playerIndex: number,
    card: Card
): boolean {
    const player = gameState.players[playerIndex];

    const currentPlayerIndex = (gameState.trickLeader + gameState.currentTrick.length) % 4;
    if (playerIndex !== currentPlayerIndex) {
        return false;
    }

    if (!player.hand.some(c => c.suit === card.suit && c.rank === card.rank)) {
        return false;
    }

    return isValidPlay(
        card,
        player.hand,
        gameState.currentTrick,
        gameState.heartsBroken,
        gameState.isFirstTrick
    );
}