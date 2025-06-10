import { Card, Suit, Rank } from '../../types/types.js';

// Create a new deck of cards
export function createDeck(): Card[] {
    const deck: Card[] = [];
    
    Object.values(Suit).forEach(suit => {
        Object.values(Rank).forEach(rank => {
            const value = calculateCardValue(rank);
            deck.push({ suit, rank, value });
        });
    });
    
    return deck;
}

// Calculate the point value of a card
export function calculateCardValue(rank: Rank): number {
    switch (rank) {
        case Rank.JACK: return 11;
        case Rank.QUEEN: return 12;
        case Rank.KING: return 13;
        case Rank.ACE: return 14;
        default: return parseInt(rank);
    }
}

// Shuffle the deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Deal cards to players (13 cards each for 4 players in Hearts)
export function dealCards(deck: Card[]): Card[][] {
    const hands: Card[][] = [[], [], [], []];
    const shuffledDeck = shuffleDeck(deck);
    
    for (let i = 0; i < shuffledDeck.length; i++) {
        const playerIndex = i % 4;
        hands[playerIndex].push(shuffledDeck[i]);
    }
    
    return hands;
}

// Sort cards in a hand (by suit and rank)
export function sortHand(hand: Card[]): Card[] {
    return [...hand].sort((a, b) => {
        // First sort by suit
        if (a.suit !== b.suit) {
            return Object.values(Suit).indexOf(a.suit) - Object.values(Suit).indexOf(b.suit);
        }
        // Then sort by value
        return a.value - b.value;
    });
}

// Check if a card is a point card
export function isPointCard(card: Card): boolean {
    return card.suit === Suit.HEARTS || 
           (card.suit === Suit.SPADES && card.rank === Rank.QUEEN);
}

// Calculate points for a trick
export function calculateTrickPoints(trick: Card[]): number {
    return trick.reduce((points, card) => {
        if (card.suit === Suit.HEARTS) {
            return points + 1;
        }
        if (card.suit === Suit.SPADES && card.rank === Rank.QUEEN) {
            return points + 13;
        }
        return points;
    }, 0);
}

// Check if a play is valid according to Hearts rules
export function isValidPlay(
    card: Card,
    hand: Card[],
    currentTrick: Card[],
    heartsBroken: boolean,
    isFirstTrick: boolean
): boolean {
    // First trick special rules
    if (isFirstTrick) {
        if (currentTrick.length === 0) {
            // Game must start with 2 of Clubs
            return card.suit === Suit.CLUBS && card.rank === Rank.TWO;
        }
        // No hearts or Queen of Spades on first trick
        if (card.suit === Suit.HEARTS || (card.suit === Suit.SPADES && card.rank === Rank.QUEEN)) {
            return false;
        }
    }

    // If leading a trick
    if (currentTrick.length === 0) {
        // Can't lead with Hearts unless Hearts are broken
        if (card.suit === Suit.HEARTS && !heartsBroken) {
            // Unless player only has Hearts left
            return hand.every(c => c.suit === Suit.HEARTS);
        }
        return true;
    }

    // Must follow suit if possible
    const leadSuit = currentTrick[0].suit;
    if (hand.some(c => c.suit === leadSuit)) {
        return card.suit === leadSuit;
    }

    // Can play any card if can't follow suit
    return true;
}
