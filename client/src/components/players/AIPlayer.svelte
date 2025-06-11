<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Hand from '../cards/Hand.svelte';
  import type { CardType } from '../../lib/types';

  export let playerName: string;
  export let cards: CardType[] = [];
  export let isActive: boolean = false;
  export let score: number = 0;
  export let position: 'north' | 'west' | 'east';
  export let passingPhase: boolean = false;
  export let isOnlineGame: boolean = false; // Add this
  export let isRealPlayer: boolean = false; // Add this - true if it's a real online player

  const dispatch = createEventDispatcher();

  let isThinking = false;
  let selectedCardsForPassing: CardType[] = [];

  // AI logic for playing a card (only for local games)
  function playRandomCard() {
    if (cards.length === 0 || !isActive || passingPhase || isOnlineGame) return;

    isThinking = true;

    // Add realistic delay for AI decision
    setTimeout(() => {
      if (cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        const selectedCard = cards[randomIndex];

        dispatch('playCard', {
          player: playerName,
          card: selectedCard
        });
      }
      isThinking = false;
    }, 800 + Math.random() * 1200); // 0.8-2 second delay
  }

  // AI logic for passing cards (only for local games)
  function selectCardsForPassing() {
    if (!passingPhase || selectedCardsForPassing.length >= 3 || isOnlineGame) return;

    // AI randomly selects 3 cards to pass
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    selectedCardsForPassing = shuffledCards.slice(0, 3);

    dispatch('cardsSelectedForPassing', {
      player: playerName,
      cards: selectedCardsForPassing
    });
  }

  // Auto-play when it becomes this AI's turn (only for local games)
  $: if (isActive && !passingPhase && !isThinking && !isOnlineGame) {
    playRandomCard();
  }

  // Auto-select cards for passing when entering passing phase (only for local games)
  $: if (passingPhase && selectedCardsForPassing.length === 0 && !isOnlineGame) {
    setTimeout(() => selectCardsForPassing(), 500 + Math.random() * 1000);
  }
</script>

<div class="player-container {position}">
  <div class="player-info">
    <div class="player-name {isActive && !passingPhase ? 'active' : ''}">{playerName}</div>
    <div class="player-score">Score: {score}</div>
    {#if isActive && !passingPhase}
      {#if isOnlineGame}
        <div class="text-yellow-300 text-xs animate-pulse">
          {isRealPlayer ? 'Playing...' : 'Waiting...'}
        </div>
      {:else if isThinking}
        <div class="text-yellow-300 text-xs animate-pulse">Thinking...</div>
      {/if}
    {/if}
    {#if passingPhase && selectedCardsForPassing.length > 0 && !isOnlineGame}
      <div class="text-blue-300 text-xs">Ready to pass</div>
    {/if}
    {#if isOnlineGame && isRealPlayer}
      <div class="text-xs text-gray-400">👤 Player</div>
    {:else if isOnlineGame && !isRealPlayer}
      <div class="text-xs text-gray-400">🤖 Bot</div>
    {/if}
  </div>

  <div class="hand-container {position === 'west' || position === 'east' ? 'vertical' : ''}">
    <Hand
            cards={cards}
            playable={false}
            isCurrentPlayer={isActive && !passingPhase}
            isCurrentUser={false}
    />
  </div>
</div>

<style>
  .player-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .player-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .player-name {
    font-weight: 600;
    font-size: 14px;
    color: rgb(209, 213, 219);
    transition: all 0.3s ease;
  }

  .player-name.active {
    color: rgb(251, 191, 36);
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  }

  .player-score {
    font-size: 12px;
    color: rgb(156, 163, 175);
  }

  .hand-container {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>