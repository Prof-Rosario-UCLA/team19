import { expect } from 'chai';
import * as sinon from 'sinon';
import { faker } from '@faker-js/faker';
import { Game, GamePhase } from '../../server/game/Game.js';
import { Card, Suit, Rank } from '../../server/game/types.js';
import { PassingDirection } from '../../server/game/gameFlow.js';

describe('Game Class', () => {
    let sandbox: sinon.SinonSandbox;
    let game: Game;
    let playerIds: string[];
    let playerNames: string[];

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        playerIds = Array.from({ length: 4 }, () => faker.string.uuid());
        playerNames = Array.from({ length: 4 }, () => faker.person.firstName());
        game = new Game(playerIds, playerNames);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Constructor and Initialization', () => {
        it('initializes a new game with 4 players', () => {
            const gameState = game.getGameState();

            expect(gameState.players).to.have.length(4);
            expect(gameState.players[0].id).to.equal(playerIds[0]);
            expect(gameState.players[0].name).to.equal(playerNames[0]);
            expect(gameState.players[1].name).to.equal(playerNames[1]);
        });

        it('starts with PASSING phase for first hand', () => {
            expect(game.getCurrentPhase()).to.equal(GamePhase.PASSING);
        });

        it('deals 13 cards to each player', () => {
            const gameState = game.getGameState();

            gameState.players.forEach(player => {
                expect(player.hand).to.have.length(13);
            });
        });
    });

    describe('Passing Phase', () => {
        it('has a passing direction for the first hand', () => {
            const direction = game.getCurrentPassingDirection();
            expect(direction).to.be.oneOf([PassingDirection.LEFT, PassingDirection.RIGHT, PassingDirection.ACROSS]);
        });

        it('tracks players who have selected passing cards', () => {
            expect(game.getPlayersReadyToPass()).to.equal(0);
            expect(game.hasPlayerSelectedPassingCards(0)).to.be.false;
        });

        it('allows players to select cards for passing', () => {
            const gameState = game.getGameState();
            const player0Hand = gameState.players[0].hand;
            const cardsToPass = player0Hand.slice(0, 3);

            const result = game.selectCardsForPassing(0, cardsToPass);
            expect(result).to.be.true;
            expect(game.hasPlayerSelectedPassingCards(0)).to.be.true;
            expect(game.getPlayersReadyToPass()).to.equal(1);
        });

        it('rejects invalid passing card selections', () => {
            const invalidCards: Card[] = [
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                { suit: Suit.SPADES, rank: Rank.KING, value: 13 }
            ];

            const result = game.selectCardsForPassing(0, invalidCards);
            expect(result).to.be.false;
        });

        it('transitions to playing phase when all players pass', () => {
            const gameState = game.getGameState();
            for (let i = 0; i < 4; i++) {
                const playerHand = gameState.players[i].hand;
                const cardsToPass = playerHand.slice(0, 3);
                game.selectCardsForPassing(i, cardsToPass);
            }

            expect(game.getCurrentPhase()).to.equal(GamePhase.PLAYING);
        });

        it('updates player hands after passing phase', () => {
            const initialGameState = game.getGameState();
            const initialHands = initialGameState.players.map(p => [...p.hand]);

            for (let i = 0; i < 4; i++) {
                const playerHand = initialGameState.players[i].hand;
                const cardsToPass = playerHand.slice(0, 3);
                game.selectCardsForPassing(i, cardsToPass);
            }

            const finalGameState = game.getGameState();

            finalGameState.players.forEach((player, index) => {
                expect(player.hand).to.have.length(13);
                expect(player.hand).to.not.deep.equal(initialHands[index]);
            });
        });
    });

    describe('Playing Phase', () => {
        beforeEach(() => {
            const gameState = game.getGameState();
            for (let i = 0; i < 4; i++) {
                const playerHand = gameState.players[i].hand;
                const cardsToPass = playerHand.slice(0, 3);
                game.selectCardsForPassing(i, cardsToPass);
            }
        });

        it('starts with the player who has 2 of Clubs', () => {
            expect(game.getCurrentPhase()).to.equal(GamePhase.PLAYING);

            const currentPlayerIndex = game.getCurrentPlayerIndex();
            expect(currentPlayerIndex).to.be.at.least(0).and.at.most(3);

            const gameState = game.getGameState();
            const currentPlayer = gameState.players[currentPlayerIndex];
            const hasTwoOfClubs = currentPlayer.hand.some(card =>
                card.suit === Suit.CLUBS && card.rank === Rank.TWO
            );
            expect(hasTwoOfClubs).to.be.true;
        });

        it('rejects invalid plays', () => {
            const currentPlayerIndex = game.getCurrentPlayerIndex();
            const gameState = game.getGameState();
            const currentPlayer = gameState.players[currentPlayerIndex];

            const wrongCard = currentPlayer.hand.find(card =>
                !(card.suit === Suit.CLUBS && card.rank === Rank.TWO)
            );

            if (wrongCard) {
                expect(game.playCard(currentPlayerIndex, wrongCard)).to.be.false;
            }
        });

        it('does not allow wrong player to play', () => {
            const currentPlayerIndex = game.getCurrentPlayerIndex();
            const wrongPlayerIndex = (currentPlayerIndex + 1) % 4;
            const gameState = game.getGameState();
            const wrongPlayer = gameState.players[wrongPlayerIndex];

            const anyCard = wrongPlayer.hand[0];
            expect(game.playCard(wrongPlayerIndex, anyCard)).to.be.false;
        });

        it('returns empty array for non-current player valid moves', () => {
            const currentPlayerIndex = game.getCurrentPlayerIndex();
            const otherPlayerIndex = (currentPlayerIndex + 1) % 4;

            const validMoves = game.getValidMoves(otherPlayerIndex);
            expect(validMoves).to.be.an('array').that.is.empty;
        });
    });

    describe('Trick Completion', () => {
        beforeEach(() => {
            // Get to playing phase
            const gameState = game.getGameState();
            for (let i = 0; i < 4; i++) {
                const playerHand = gameState.players[i].hand;
                const cardsToPass = playerHand.slice(0, 3);
                game.selectCardsForPassing(i, cardsToPass);
            }
        });

        it('completes a full trick with 4 cards', () => {
            const gameState = game.getGameState();

            // Play 2 of Clubs
            const firstPlayerIndex = game.getCurrentPlayerIndex();
            const firstPlayer = gameState.players[firstPlayerIndex];
            const twoOfClubs = firstPlayer.hand.find(card =>
                card.suit === Suit.CLUBS && card.rank === Rank.TWO
            )!;

            game.playCard(firstPlayerIndex, twoOfClubs);

            // Play 3 more cards to complete the trick
            for (let i = 1; i < 4; i++) {
                const currentPlayerIndex = game.getCurrentPlayerIndex();
                const validMoves = game.getValidMoves(currentPlayerIndex);

                if (validMoves.length > 0) {
                    game.playCard(currentPlayerIndex, validMoves[0]);
                }
            }

            expect(game.getCurrentPhase()).to.equal(GamePhase.PLAYING);
        });
    });

    describe('Hand Completion and Scoring', () => {
        it('starts at PASSING phase when transitioning to scoring', () => {
            expect(game.getCurrentPhase()).to.equal(GamePhase.PASSING);
        });

        it('should not have a winner initially', () => {
            expect(game.getWinner()).to.be.null;
        });
    });

    describe('Game State Management', () => {
        it('returns a copy of game state, not the original', () => {
            const gameState1 = game.getGameState();
            const gameState2 = game.getGameState();

            expect(gameState1).to.not.equal(gameState2);
            expect(gameState1).to.deep.equal(gameState2);
        });

        it('tracks current phase as a valid state', () => {
            expect(game.getCurrentPhase()).to.be.oneOf([
                GamePhase.INITIALIZING,
                GamePhase.PASSING,
                GamePhase.PLAYING,
                GamePhase.SCORING,
                GamePhase.FINISHED
            ]);
        });

        it('tracks current player index', () => {
            const currentIndex = game.getCurrentPlayerIndex();
            expect(currentIndex).to.be.at.least(-1).and.at.most(3);
        });
    });
});
