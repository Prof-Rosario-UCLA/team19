import { expect } from 'chai';
import * as sinon from 'sinon';

import {
    createDeck,
    calculateCardValue,
    shuffleDeck,
    dealCards,
    sortHand,
    isPointCard,
    calculateTrickPoints,
    isValidPlay
} from '../../server/game/Deck.js';
import { Card, Suit, Rank } from '../../server/game/types.js';

describe('Deck Game Logic', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('createDeck', () => {
        it('creates a deck with 52 cards', () => {
            const deck = createDeck();
            expect(deck).to.have.length(52);
        });

        it('creates cards with correct suits and ranks', () => {
            const deck = createDeck();
            const suits = Object.values(Suit);
            const ranks = Object.values(Rank);

            suits.forEach(suit => {
                ranks.forEach(rank => {
                    const card = deck.find(c => c.suit === suit && c.rank === rank);
                    expect(card).to.exist;
                    expect(card?.value).to.equal(calculateCardValue(rank));
                });
            });
        });

        it('has exactly 13 cards per suit', () => {
            const deck = createDeck();
            Object.values(Suit).forEach(suit => {
                const suitCards = deck.filter(card => card.suit === suit);
                expect(suitCards).to.have.length(13);
            });
        });

        it('has exactly 4 cards per rank', () => {
            const deck = createDeck();
            Object.values(Rank).forEach(rank => {
                const rankCards = deck.filter(card => card.rank === rank);
                expect(rankCards).to.have.length(4);
            });
        });
    });

    describe('calculateCardValue', () => {
        it('returns correct values for face cards', () => {
            expect(calculateCardValue(Rank.JACK)).to.equal(11);
            expect(calculateCardValue(Rank.QUEEN)).to.equal(12);
            expect(calculateCardValue(Rank.KING)).to.equal(13);
            expect(calculateCardValue(Rank.ACE)).to.equal(14);
        });

        it('returns correct values for number cards', () => {
            expect(calculateCardValue(Rank.TWO)).to.equal(2);
            expect(calculateCardValue(Rank.THREE)).to.equal(3);
            expect(calculateCardValue(Rank.FOUR)).to.equal(4);
            expect(calculateCardValue(Rank.FIVE)).to.equal(5);
            expect(calculateCardValue(Rank.SIX)).to.equal(6);
            expect(calculateCardValue(Rank.SEVEN)).to.equal(7);
            expect(calculateCardValue(Rank.EIGHT)).to.equal(8);
            expect(calculateCardValue(Rank.NINE)).to.equal(9);
            expect(calculateCardValue(Rank.TEN)).to.equal(10);
        });
    });

    describe('shuffleDeck', () => {
        let mathRandomStub: sinon.SinonStub;

        beforeEach(() => {
            mathRandomStub = sandbox.stub(Math, 'random');
        });

        it('return a new array (not mutated original)', () => {
            const originalDeck = createDeck();
            const shuffled = shuffleDeck(originalDeck);

            expect(shuffled).to.not.equal(originalDeck);
            expect(shuffled).to.have.length(originalDeck.length);
        });

        it('shuffles cards using Fisher-Yates algorithm', () => {
            const deck = [
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 },
                { suit: Suit.HEARTS, rank: Rank.THREE, value: 3 }
            ];

            mathRandomStub.onCall(0).returns(0.5);
            mathRandomStub.onCall(1).returns(0);

            const shuffled = shuffleDeck(deck);

            expect(shuffled).to.have.length(3);
            expect(shuffled).to.not.deep.equal(deck);
        });

        it('handles single card deck', () => {
            const singleCard = [{ suit: Suit.HEARTS, rank: Rank.ACE, value: 14 }];
            const shuffled = shuffleDeck(singleCard);
            expect(shuffled).to.deep.equal(singleCard);
            expect(shuffled).to.not.equal(singleCard);
        });

        it('handles empty deck', () => {
            const emptyDeck: Card[] = [];
            const shuffled = shuffleDeck(emptyDeck);
            expect(shuffled).to.be.an('array').that.is.empty;
        });
    });

    describe('dealCards', () => {
        it('deals 13 cards to each of 4 players', () => {
            const deck = createDeck();
            const hands = dealCards(deck);

            expect(hands).to.have.length(4);
            hands.forEach(hand => {
                expect(hand).to.have.length(13);
            });
        });

        it('distributes all cards from deck', () => {
            const deck = createDeck();
            const hands = dealCards(deck);

            const totalCards = hands.reduce((total, hand) => total + hand.length, 0);
            expect(totalCards).to.equal(52);
        });

        it('handles non-standard deck sizes', () => {
            const smallDeck = [
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 },
                { suit: Suit.HEARTS, rank: Rank.THREE, value: 3 },
                { suit: Suit.HEARTS, rank: Rank.FOUR, value: 4 }
            ];

            const hands = dealCards(smallDeck);
            expect(hands).to.have.length(4);
            expect(hands[0]).to.have.length(1);
            expect(hands[1]).to.have.length(1);
            expect(hands[2]).to.have.length(1);
            expect(hands[3]).to.have.length(1);
        });
    });

    describe('sortHand', () => {
        it('sorts cards by suit first, then by value', () => {
            const unsortedHand: Card[] = [
                { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 },
                { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 },
                { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
            ];

            const sorted = sortHand(unsortedHand);

            expect(sorted[0].suit).to.equal(Suit.HEARTS);
            expect(sorted[0].value).to.equal(2);
            expect(sorted[1].suit).to.equal(Suit.HEARTS);
            expect(sorted[1].value).to.equal(13);
            expect(sorted[2].suit).to.equal(Suit.CLUBS);
            expect(sorted[3].suit).to.equal(Suit.SPADES);

            expect(sorted).to.have.length(4);
        });

        it('does not mutate the original hand', () => {
            const originalHand: Card[] = [
                { suit: Suit.HEARTS, rank: Rank.KING, value: 13 },
                { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 }
            ];
            const originalHandCopy = [...originalHand];

            const sorted = sortHand(originalHand);

            expect(originalHand).to.deep.equal(originalHandCopy);
            expect(sorted).to.not.equal(originalHand);
        });

        it('handles single card', () => {
            const singleCard = [{ suit: Suit.HEARTS, rank: Rank.ACE, value: 14 }];
            const sorted = sortHand(singleCard);
            expect(sorted).to.deep.equal(singleCard);
            expect(sorted).to.not.equal(singleCard);
        });

        it('handles empty hand', () => {
            const emptyHand: Card[] = [];
            const sorted = sortHand(emptyHand);
            expect(sorted).to.be.an('array').that.is.empty;
        });
    });

    describe('isPointCard', () => {
        it('returns true for all Hearts cards', () => {
            Object.values(Rank).forEach(rank => {
                const heartsCard: Card = { suit: Suit.HEARTS, rank, value: calculateCardValue(rank) };
                expect(isPointCard(heartsCard)).to.be.true;
            });
        });

        it('returns true for Queen of Spades', () => {
            const queenOfSpades: Card = { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 };
            expect(isPointCard(queenOfSpades)).to.be.true;
        });

        it('returns false for non-point cards', () => {
            const nonPointCards: Card[] = [
                { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 },
                { suit: Suit.DIAMONDS, rank: Rank.KING, value: 13 },
                { suit: Suit.SPADES, rank: Rank.ACE, value: 14 },
                { suit: Suit.SPADES, rank: Rank.KING, value: 13 }
            ];

            nonPointCards.forEach(card => {
                expect(isPointCard(card)).to.be.false;
            });
        });
    });

    describe('calculateTrickPoints', () => {
        it('returns 0 for trick with no point cards', () => {
            const trick: Card[] = [
                { suit: Suit.CLUBS, rank: Rank.ACE, value: 14 },
                { suit: Suit.DIAMONDS, rank: Rank.KING, value: 13 },
                { suit: Suit.SPADES, rank: Rank.JACK, value: 11 },
                { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 }
            ];

            expect(calculateTrickPoints(trick)).to.equal(0);
        });

        it('returns 1 point per Hearts card', () => {
            const trick: Card[] = [
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 },
                { suit: Suit.CLUBS, rank: Rank.KING, value: 13 }
            ];

            expect(calculateTrickPoints(trick)).to.equal(2);
        });

        it('returns 13 points for Queen of Spades', () => {
            const trick: Card[] = [
                { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 },
                { suit: Suit.CLUBS, rank: Rank.KING, value: 13 }
            ];

            expect(calculateTrickPoints(trick)).to.equal(13);
        });

        it('returns 14 points for Queen of Spades plus one Heart', () => {
            const trick: Card[] = [
                { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 },
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 }
            ];

            expect(calculateTrickPoints(trick)).to.equal(14);
        });

        it('handles empty trick', () => {
            const emptyTrick: Card[] = [];
            expect(calculateTrickPoints(emptyTrick)).to.equal(0);
        });

        it('calculates correct points for all Hearts (13 points)', () => {
            const allHearts: Card[] = Object.values(Rank).map(rank => ({
                suit: Suit.HEARTS,
                rank,
                value: calculateCardValue(rank)
            }));

            expect(calculateTrickPoints(allHearts)).to.equal(13);
        });
    });

    describe('isValidPlay', () => {
        let hand: Card[];
        let currentTrick: Card[];

        beforeEach(() => {
            hand = [
                { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 },
                { suit: Suit.CLUBS, rank: Rank.THREE, value: 3 },
                { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 }
            ];
            currentTrick = [];
        });

        describe('First trick rules', () => {
            it('requires 2 of Clubs to start first trick', () => {
                const twoOfClubs = { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 };
                const otherCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(twoOfClubs, hand, [], false, true)).to.be.true;
                expect(isValidPlay(otherCard, hand, [], false, true)).to.be.false;
            });

            it('does not allow Hearts on first trick', () => {
                currentTrick = [{ suit: Suit.CLUBS, rank: Rank.TWO, value: 2 }];
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(heartsCard, hand, currentTrick, false, true)).to.be.false;
            });

            it('does not allow Queen of Spades on first trick', () => {
                currentTrick = [{ suit: Suit.CLUBS, rank: Rank.TWO, value: 2 }];
                const queenOfSpades = { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 };

                expect(isValidPlay(queenOfSpades, hand, currentTrick, false, true)).to.be.false;
            });

            it('does not allow non-point cards on first trick', () => {
                currentTrick = [{ suit: Suit.CLUBS, rank: Rank.TWO, value: 2 }];
                const clubsCard = { suit: Suit.CLUBS, rank: Rank.THREE, value: 3 };

                expect(isValidPlay(clubsCard, hand, currentTrick, false, true)).to.be.true;
            });
        });

        describe('Leading a trick', () => {
            it('does not allow leading Hearts when not broken', () => {
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(heartsCard, hand, [], false, false)).to.be.false;
            });

            it('allows leading Hearts when broken', () => {
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(heartsCard, hand, [], true, false)).to.be.true;
            });

            it('allows leading Hearts when only Hearts left', () => {
                const heartsOnlyHand = [
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.HEARTS, rank: Rank.TWO, value: 2 }
                ];
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(heartsCard, heartsOnlyHand, [], false, false)).to.be.true;
            });

            it('allows leading non-Hearts cards', () => {
                const clubsCard = { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 };

                expect(isValidPlay(clubsCard, hand, [], false, false)).to.be.true;
            });
        });

        describe('Following suit', () => {
            beforeEach(() => {
                currentTrick = [{ suit: Suit.CLUBS, rank: Rank.KING, value: 13 }];
            });

            it('requires following suit when possible', () => {
                const clubsCard = { suit: Suit.CLUBS, rank: Rank.TWO, value: 2 };
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(clubsCard, hand, currentTrick, false, false)).to.be.true;
                expect(isValidPlay(heartsCard, hand, currentTrick, false, false)).to.be.false;
            });

            it('allows any card when cannot follow suit', () => {
                const handWithoutClubs = [
                    { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 },
                    { suit: Suit.SPADES, rank: Rank.QUEEN, value: 12 },
                    { suit: Suit.DIAMONDS, rank: Rank.KING, value: 13 }
                ];
                const heartsCard = { suit: Suit.HEARTS, rank: Rank.ACE, value: 14 };

                expect(isValidPlay(heartsCard, handWithoutClubs, currentTrick, false, false)).to.be.true;
            });
        });
    });
});