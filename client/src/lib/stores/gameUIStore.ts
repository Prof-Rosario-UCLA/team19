import { writable } from 'svelte/store';
import type { Card } from '../../../../types/game.js';

interface GameUIState {
    selectedCards: Card[];
    isPassing: boolean;
    showPassingConfirmation: boolean;
    showGameOver: boolean;
    errorMessage: string | null;
}

const initialState: GameUIState = {
    selectedCards: [],
    isPassing: false,
    showPassingConfirmation: false,
    showGameOver: false,
    errorMessage: null
};

const { subscribe, set, update } = writable<GameUIState>(initialState);

export const gameUI = {
    subscribe,
    selectedCards: initialState.selectedCards,
    selectCard: (card: Card) => update(state => {
        if (state.selectedCards.length < 3 && !state.selectedCards.some(c => 
            c.suit === card.suit && c.rank === card.rank
        )) {
            return {
                ...state,
                selectedCards: [...state.selectedCards, card]
            };
        }
        return state;
    }),
    deselectCard: (card: Card) => update(state => ({
        ...state,
        selectedCards: state.selectedCards.filter(c => 
            !(c.suit === card.suit && c.rank === card.rank)
        )
    })),
    clearSelection: () => update(state => ({
        ...state,
        selectedCards: []
    })),
    setPassing: (isPassing: boolean) => update(state => ({
        ...state,
        isPassing,
        selectedCards: isPassing ? state.selectedCards : []
    })),
    setShowPassingConfirmation: (show: boolean) => update(state => ({
        ...state,
        showPassingConfirmation: show
    })),
    setShowGameOver: (show: boolean) => update(state => ({
        ...state,
        showGameOver: show
    })),
    setError: (message: string | null) => update(state => ({
        ...state,
        errorMessage: message
    })),
    reset: () => set(initialState)
}; 