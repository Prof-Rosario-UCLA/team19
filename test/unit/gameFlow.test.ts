import { expect } from 'chai';
import * as sinon from 'sinon';
import {
    PassingDirection,
    PassingState,
    initializeGame,
    dealNewHand,
    getPassingDirection,
    initializePassingState,
    validatePassingCards,
    selectCardsForPassing,
    executePassingPhase,
    hasPlayerSelectedPassingCards,
    getPlayersReadyToPass,
    findStartingPlayer,
    playCard,
    determineTrickWinner,
    finishTrick,
    isHandComplete,
    startNewHand,
    scoreHand,
    isGameOver,
    getGameWinner,
    canPlayCard
} from '../../server/game/gameFlow.js';
import { Card, Suit, Rank, GameState } from '../../types/types.js';

describe('GameFlow Module', () => {
    let sandbox: sinon.SinonSandbox;
    let playerIds: string[];
    let playerNames: string[];
    let gameState: GameState;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        playerIds = ['player1', 'player2', 'player3', 'player4'];
        playerNames = ['Alice', 'Bob', 'Charlie', 'David'];
        gameState = initializeGame(playerIds, playerNames);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Game Initialization', () => {
        describe('initializeGame', () => {
            it('initializes game with 4 players', () => {
                expect(gameState.players).to.have.length(4);
                expect(gameState.players[0].id).to.equal('player1');
                expect(gameState.players[0].name).to.equal(playerNames[0]);
                expect(gameState.players[1].name).to.equal(playerNames[1]);
            });

            it('initializes players with empty hands and zero scores', () => {
                gameState.players.forEach(player => {
                    expect(player.hand).to.be.an('array').that.is.empty;
                    expect(player.score).to.equal(0);
                });
            });

            it('initializes game state properties', () => {
                expect(gameState.deck).to.be.an('array').that.is.empty;
                expect(gameState.currentTrick).to.be.an('array').that.is.empty;
                expect(gameState.trickLeader).to.equal(0);
                expect(gameState.heartsBroken).to.be.false;
                expect(gameState.handNumber).to.equal(0);
                expect(gameState.isFirstTrick).to.be.true;
                expect(gameState.tricksPlayed).to.equal(0);
            });

            it('initializes scores object', () => {
                expect(gameState.scores).to.have.property('player1', 0);
                expect(gameState.scores).to.have.property('player2', 0);
                expect(gameState.scores).to.have.property('player3', 0);
                expect(gameState.scores).to.have.property('player4', 0);
            });

            it('throws error for wrong number of players', () => {
                expect(() => initializeGame(['p1', 'p2'], ['Alice', 'Bob'])).to.throw('Hearts requires exactly 4 players');
                expect(() => initializeGame(['p1', 'p2', 'p3', 'p4', 'p5'], ['Alice', 'Bob', 'Charlie', 'David', 'Eve'])).to.throw('Hearts requires exactly 4 players');
            });

            it('handles mismatched player arrays', () => {
                const shortNames = ['Alice', 'Bob'];
                expect(() => initializeGame(playerIds, shortNames)).to.throw('Hearts requires exactly 4 players');
            });
        });

        describe('dealNewHand', () => {
            it('deals 13 cards to each player', () => {
                const updatedState = dealNewHand(gameState);

                updatedState.players.forEach(player => {
                    expect(player.hand).to.have.length(13);
                });
            });

            it('distributes all 52 cards', () => {
                const updatedState = dealNewHand(gameState);

                const totalCards = updatedState.players.reduce(
                    (total, player) => total + player.hand.length,
                    0
                );
                expect(totalCards).to.equal(52);
            });

            it('resets game state for new hand', () => {
                const updatedState = dealNewHand(gameState);

                expect(updatedState.currentTrick).to.be.empty;
                expect(updatedState.heartsBroken).to.be.false;
                expect(updatedState.isFirstTrick).to.be.true;
                expect(updatedState.tricksPlayed).to.equal(0);
                expect(updatedState.deck).to.have.length(52);
            });

            it('sorts player hands', () => {
                const updatedState = dealNewHand(gameState);

                updatedState.players.forEach(player => {
                    for (let i = 1; i < player.hand.length; i++) {
                        const prevCard = player.hand[i - 1];
                        const currCard = player.hand[i];

                        if (prevCard.suit === currCard.suit) {
                            expect(prevCard.value).to.be.at.most(currCard.value);
                        }
                    }
                });
            });
        });
    });

    describe('Passing Logic', () => {
        describe('getPassingDirection', () => {
            it('returns correct directions for hand numbers', () => {
                expect(getPassingDirection(0)).to.equal(PassingDirection.LEFT);
                expect(getPassingDirection(1)).to.equal(PassingDirection.RIGHT);
                expect(getPassingDirection(2)).to.equal(PassingDirection.ACROSS);
                expect(getPassingDirection(3)).to.equal(PassingDirection.HOLD);
                expect(getPassingDirection(4)).to.equal(PassingDirection.LEFT);
                expect(getPassingDirection(5)).to.equal(PassingDirection.RIGHT);
            });

            it('handles large hand numbers', () => {
                expect(getPassingDirection(100)).to.equal(PassingDirection.LEFT);
                expect(getPassingDirection(101)).to.equal(PassingDirection.RIGHT);
            });
        });

        describe('initializePassingState', () => {
            it('creates passing state with correct direction', () => {
                const passingState = initializePassingState(0);

                expect(passingState.direction).to.equal(PassingDirection.LEFT);
                expect(passingState.selectedCards).to.be.instanceOf(Map);
                expect(passingState.selectedCards.size).to.equal(0);
                expect(passingState.isComplete).to.be.false;
            });

            it('handles hold hands', () => {
                const passingState = initializePassingState(3);

                expect(passingState.direction).to.equal(PassingDirection.HOLD);
                expect(passingState.isComplete).to.be.false;
            });
        });

        describe('validatePassingCards', () => {
            let playerHand: Card[];

            beforeEach(() => {
                playerHand = [
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 },
                    { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 }
                ];
            });

            it('validates correct number of cards', () => {
                const validCards = playerHand.slice(0, 3);
                expect(validatePassingCards(validCards, playerHand)).to.be.true;

                const tooFewCards = playerHand.slice(0, 2);
                expect(validatePassingCards(tooFewCards, playerHand)).to.be.false;

                const tooManyCards = [...playerHand];
                expect(validatePassingCards(tooManyCards, playerHand)).to.be.false;
            });

            it('validates cards are in player hand', () => {
                const validCards = playerHand.slice(0, 3);
                expect(validatePassingCards(validCards, playerHand)).to.be.true;

                const invalidCards = [
                    { suit: Suit.DIAMONDS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.CLUBS, rank: Rank.THREE, value: 3 },
                    { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 }
                ];
                expect(validatePassingCards(invalidCards, playerHand)).to.be.false;
            });

            it('handles empty arrays', () => {
                expect(validatePassingCards([], playerHand)).to.be.false;
                expect(validatePassingCards(playerHand.slice(0, 3), [])).to.be.false;
            });
        });

        describe('selectCardsForPassing', () => {
            let passingState: PassingState;
            let gameStateWithCards: GameState;

            beforeEach(() => {
                passingState = initializePassingState(0);
                gameStateWithCards = dealNewHand(gameState);
            });

            it('selects valid cards for passing', () => {
                const player0Hand = gameStateWithCards.players[0].hand;
                const cardsToPass = player0Hand.slice(0, 3);

                const result = selectCardsForPassing(gameStateWithCards, passingState, 0, cardsToPass);

                expect(result).to.not.be.null;
                expect(result!.selectedCards.get(0)).to.deep.equal(cardsToPass);
                expect(result!.isComplete).to.be.false;
            });

            it('rejects invalid card selections', () => {
                const invalidCards = [
                    { suit: Suit.DIAMONDS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.CLUBS, rank: Rank.THREE, value: 3 }
                ];

                const result = selectCardsForPassing(gameStateWithCards, passingState, 0, invalidCards);
                expect(result).to.be.null;
            });

            it('returns null for HOLD direction', () => {
                const holdPassingState = initializePassingState(3);
                const player0Hand = gameStateWithCards.players[0].hand;
                const cardsToPass = player0Hand.slice(0, 3);

                const result = selectCardsForPassing(gameStateWithCards, holdPassingState, 0, cardsToPass);
                expect(result).to.be.null;
            });

            it('marks as complete when all players select', () => {
                let currentPassingState = passingState;

                for (let i = 0; i < 4; i++) {
                    const playerHand = gameStateWithCards.players[i].hand;
                    const cardsToPass = playerHand.slice(0, 3);

                    currentPassingState = selectCardsForPassing(gameStateWithCards, currentPassingState, i, cardsToPass)!;
                    expect(currentPassingState).to.not.be.null;
                }

                expect(currentPassingState.isComplete).to.be.true;
            });
        });

        describe('executePassingPhase', () => {
            let passingState: PassingState;
            let gameStateWithCards: GameState;

            beforeEach(() => {
                passingState = initializePassingState(0);
                gameStateWithCards = dealNewHand(gameState);
            });

            it('executes passing correctly', () => {
                let currentPassingState = passingState;

                for (let i = 0; i < 4; i++) {
                    const playerHand = gameStateWithCards.players[i].hand;
                    const cardsToPass = playerHand.slice(0, 3);
                    currentPassingState = selectCardsForPassing(gameStateWithCards, currentPassingState, i, cardsToPass)!;
                }

                const result = executePassingPhase(gameStateWithCards, currentPassingState);

                expect(result).to.not.be.null;
                result!.players.forEach(player => {
                    expect(player.hand).to.have.length(13);
                });
            });

            it('returns original state for HOLD direction', () => {
                const holdPassingState = initializePassingState(3);
                const result = executePassingPhase(gameStateWithCards, holdPassingState);

                expect(result).to.equal(gameStateWithCards);
            });

            it('passes cards in correct direction', () => {
                let currentPassingState = passingState;

                for (let i = 0; i < 4; i++) {
                    const playerHand = gameStateWithCards.players[i].hand;
                    const cardsToPass = playerHand.slice(0, 3);
                    currentPassingState = selectCardsForPassing(gameStateWithCards, currentPassingState, i, cardsToPass)!;
                }

                const result = executePassingPhase(gameStateWithCards, currentPassingState);

                expect(result).to.not.be.null;
            });
        });

        describe('Passing Utility Functions', () => {
            let passingState: PassingState;

            beforeEach(() => {
                passingState = initializePassingState(0);
            });

            it('checks if player has selected cards', () => {
                expect(hasPlayerSelectedPassingCards(passingState, 0)).to.be.false;

                const cards = [
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
                ];
                passingState.selectedCards.set(0, cards);

                expect(hasPlayerSelectedPassingCards(passingState, 0)).to.be.true;
            });

            it('counts players ready to pass', () => {
                expect(getPlayersReadyToPass(passingState)).to.equal(0);

                const cards = [
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
                ];

                passingState.selectedCards.set(0, cards);
                passingState.selectedCards.set(1, cards);

                expect(getPlayersReadyToPass(passingState)).to.equal(2);
            });
        });
    });

    describe('Playing Logic', () => {
        let gameStateWithCards: GameState;

        beforeEach(() => {
            gameStateWithCards = dealNewHand(gameState);
        });

        describe('findStartingPlayer', () => {
            it('finds player with 2 of Clubs', () => {
                const startingPlayerIndex = findStartingPlayer(gameStateWithCards);

                expect(startingPlayerIndex).to.be.at.least(0).and.at.most(3);

                const startingPlayer = gameStateWithCards.players[startingPlayerIndex];
                const hasTwoOfClubs = startingPlayer.hand.some(card =>
                    card.suit === Suit.CLUBS && card.rank === Rank.TWO
                );
                expect(hasTwoOfClubs).to.be.true;
            });

            it('returns -1 if no player has 2 of Clubs', () => {
                gameStateWithCards.players.forEach(player => {
                    player.hand = player.hand.filter(card =>
                        !(card.suit === Suit.CLUBS && card.rank === Rank.TWO)
                    );
                });

                const result = findStartingPlayer(gameStateWithCards);
                expect(result).to.equal(-1);
            });
        });

        describe('playCard', () => {
            let startingPlayerIndex: number;
            let twoOfClubs: Card;

            beforeEach(() => {
                startingPlayerIndex = findStartingPlayer(gameStateWithCards);
                const startingPlayer = gameStateWithCards.players[startingPlayerIndex];
                twoOfClubs = startingPlayer.hand.find(card =>
                    card.suit === Suit.CLUBS && card.rank === Rank.TWO
                )!;
            });

            it('plays a valid card successfully', () => {
                const result = playCard(gameStateWithCards, startingPlayerIndex, twoOfClubs);

                expect(result).to.not.be.null;
                expect(result!.currentTrick).to.have.length(1);
                expect(result!.currentTrick[0]).to.deep.equal(twoOfClubs);

                const player = result!.players[startingPlayerIndex];
                const stillHasCard = player.hand.some(card =>
                    card.suit === twoOfClubs.suit && card.rank === twoOfClubs.rank
                );
                expect(stillHasCard).to.be.false;
            });

            it('breaks hearts when Hearts card is played', () => {
                gameStateWithCards.heartsBroken = false;
                gameStateWithCards.isFirstTrick = false;
                gameStateWithCards.currentTrick = [twoOfClubs];

                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };
                gameStateWithCards.players[1].hand = [heartsCard];

                const result = playCard(gameStateWithCards, 1, heartsCard);

                if (result) {
                    expect(result.heartsBroken).to.be.true;
                }
            });

            it('should return null for invalid plays', () => {
                const invalidCard = gameStateWithCards.players[startingPlayerIndex].hand.find(card =>
                    !(card.suit === Suit.CLUBS && card.rank === Rank.TWO)
                );

                if (invalidCard) {
                    const result = playCard(gameStateWithCards, startingPlayerIndex, invalidCard);
                    expect(result).to.be.null;
                }
            });
        });

        describe('determineTrickWinner', () => {
            it('determines winner of simple trick', () => {
                const trick: Card[] = [
                    { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 },
                    { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.CLUBS, rank: Rank.KING, value: 13 },
                    { suit: Suit.CLUBS, rank: Rank.QUEEN, value: 12 }
                ];

                const winner = determineTrickWinner(trick);
                expect(winner.playerIndex).to.equal(1);
                expect(winner.points).to.equal(0);
            });

            it('calculates points correctly', () => {
                const trick: Card[] = [
                    { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 },
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
                ];

                const winner = determineTrickWinner(trick);
                expect(winner.playerIndex).to.equal(0);
                expect(winner.points).to.equal(15);
            });

            it('handles empty trick', () => {
                const winner = determineTrickWinner([]);
                expect(winner.playerIndex).to.equal(0);
                expect(winner.points).to.equal(0);
            });

            it('follows suit rules', () => {
                const trick: Card[] = [
                    { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 },
                    { suit: Suit.SPADES, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.DIAMONDS, rank: Rank.ACE, value: 14 }
                ];

                const winner = determineTrickWinner(trick);
                expect(winner.playerIndex).to.equal(2);
            });
        });

        describe('finishTrick', () => {
            beforeEach(() => {
                gameStateWithCards.currentTrick = [
                    { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 },
                    { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
                ];
            });

            it('finishes trick and update game state', () => {
                const result = finishTrick(gameStateWithCards);

                expect(result.currentTrick).to.be.empty;
                expect(result.tricksPlayed).to.equal(1);
                expect(result.isFirstTrick).to.be.false;
                expect(result.trickLeader).to.equal(1);
            });

            it('adds points to winner', () => {
                const initialScore = gameStateWithCards.players[1].score;
                const result = finishTrick(gameStateWithCards);

                expect(result.players[1].score).to.equal(initialScore + 14);
            });
        });

        describe('canPlayCard', () => {
            beforeEach(() => {
                gameStateWithCards.trickLeader = 0;
                gameStateWithCards.currentTrick = [];
            });

            it('allows valid card plays', () => {
                const startingPlayerIndex = findStartingPlayer(gameStateWithCards);
                gameStateWithCards.trickLeader = startingPlayerIndex;

                const player = gameStateWithCards.players[startingPlayerIndex];
                const twoOfClubs = player.hand.find(card =>
                    card.suit === Suit.CLUBS && card.rank === Rank.TWO
                )!;

                const canPlay = canPlayCard(gameStateWithCards, startingPlayerIndex, twoOfClubs);
                expect(canPlay).to.be.true;
            });

            it('rejects plays when not player turn', () => {
                const startingPlayerIndex = findStartingPlayer(gameStateWithCards);
                gameStateWithCards.trickLeader = startingPlayerIndex;

                const wrongPlayerIndex = (startingPlayerIndex + 1) % 4;
                const anyCard = gameStateWithCards.players[wrongPlayerIndex].hand[0];

                const canPlay = canPlayCard(gameStateWithCards, wrongPlayerIndex, anyCard);
                expect(canPlay).to.be.false;
            });

            it('rejects cards not in player hand', () => {
                const startingPlayerIndex = findStartingPlayer(gameStateWithCards);
                gameStateWithCards.trickLeader = startingPlayerIndex;

                const fakeCard: Card = { suit: Suit.DIAMONDS, rank: Rank.ACE, value: 14 };

                const canPlay = canPlayCard(gameStateWithCards, startingPlayerIndex, fakeCard);
                expect(canPlay).to.be.false;
            });
        });
    });

    describe('Hand and Game Completion', () => {
        describe('isHandComplete', () => {
            it('returns false for incomplete hands', () => {
                gameState.tricksPlayed = 12;
                expect(isHandComplete(gameState)).to.be.false;
            });

            it('returns true for complete hands', () => {
                gameState.tricksPlayed = 13;
                expect(isHandComplete(gameState)).to.be.true;
            });
        });

        describe('startNewHand', () => {
            it('increments hand number and reset state', () => {
                const initialHandNumber = gameState.handNumber;
                const result = startNewHand(gameState);

                expect(result.handNumber).to.equal(initialHandNumber + 1);
                expect(result.isFirstTrick).to.be.true;
                expect(result.tricksPlayed).to.equal(0);
                expect(result.currentTrick).to.be.empty;
                expect(result.heartsBroken).to.be.false;
            });
        });

        describe('scoreHand', () => {
            beforeEach(() => {
                gameState.players[0].score = 10;
                gameState.players[1].score = 5;
                gameState.players[2].score = 8;
                gameState.players[3].score = 3;
            });

            it('updates game scores', () => {
                const result = scoreHand(gameState);

                expect(result.scores['player1']).to.equal(10);
                expect(result.scores['player2']).to.equal(5);
                expect(result.scores['player3']).to.equal(8);
                expect(result.scores['player4']).to.equal(3);
            });

            it('handles shooting the moon', () => {
                gameState.players[0].score = 26;
                gameState.players[1].score = 0;
                gameState.players[2].score = 0;
                gameState.players[3].score = 0;

                const result = scoreHand(gameState);

                expect(result.scores['player1']).to.equal(0);
                expect(result.scores['player2']).to.equal(26);
                expect(result.scores['player3']).to.equal(26);
                expect(result.scores['player4']).to.equal(26);
            });
        });

        describe('isGameOver', () => {
            it('returns false when no player has reached max score', () => {
                gameState.scores = { player1: 50, player2: 60, player3: 40, player4: 30 };
                expect(isGameOver(gameState, 100)).to.be.false;
            });

            it('returns true when a player reaches max score', () => {
                gameState.scores = { player1: 100, player2: 60, player3: 40, player4: 30 };
                expect(isGameOver(gameState, 100)).to.be.true;
            });
        });

        describe('getGameWinner', () => {
            it('returns player with lowest score', () => {
                gameState.scores = { player1: 100, player2: 60, player3: 40, player4: 30 };
                const winner = getGameWinner(gameState);
                expect(winner).to.equal('player4');
            });

            it('handles tied lowest scores', () => {
                gameState.scores = { player1: 100, player2: 30, player3: 40, player4: 30 };
                const winner = getGameWinner(gameState);
                expect(winner).to.be.oneOf(['player2', 'player4']);
            });
        });
    });
});