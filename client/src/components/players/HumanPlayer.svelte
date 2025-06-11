<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Card from '../cards/Card.svelte';
  import type { CardType } from '../../lib/types';
  
  export let playerName: string = 'You';
  export let cards: CardType[] = [];
  export let isActive: boolean = false;
  export let score: number = 0;
  export let passingPhase: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let selectedCardsForPassing: CardType[] = [];
  
  // Handle card selection (for passing or playing)
  function handleCardSelect(event) {
    const card = event.detail;
    
    if (passingPhase) {
      // Handle card selection for passing
      const cardIndex = selectedCardsForPassing.findIndex(c => 
        c.suit === card.suit && c.rank === card.rank
      );
      
      if (cardIndex === -1) {
        // Add card if not already selected and less than 3 cards selected
        if (selectedCardsForPassing.length < 3) {
          selectedCardsForPassing = [...selectedCardsForPassing, card];
        }
      } else {
        // Remove card if already selected
        selectedCardsForPassing = selectedCardsForPassing.filter((_, i) => i !== cardIndex);
      }
      
      // Notify parent of selection change
      dispatch('cardsSelectedForPassing', {
        player: playerName,
        cards: selectedCardsForPassing
      });
      
    } else if (isActive) {
      // Handle card play during game
      dispatch('playCard', {
        player: playerName,
        card: card
      });
    }
  }
  
  // Check if a card is selected for passing
  function isCardSelected(card: CardType): boolean {
    return selectedCardsForPassing.some(c => c.suit === card.suit && c.rank === card.rank);
  }
  
  // Clear selected cards when passing phase ends
  $: if (!passingPhase) {
    selectedCardsForPassing = [];
  }
  
  // Check if ready to pass
  $: readyToPass = passingPhase && selectedCardsForPassing.length === 3;
  
  // Notify parent when ready to pass changes
  $: {
    dispatch('readyToPassChanged', {
      player: playerName,
      ready: readyToPass,
      selectedCards: selectedCardsForPassing
    });
  }
</script>

<div class="player-container you">
  <div class="player-info">
    <h2 class="player-name {isActive && !passingPhase ? 'active' : ''}">
      {playerName}
    </h2>
    <div class="player-score">Score: {score}</div>
    {#if passingPhase}
      <div class="text-sm text-center">
        <div class="text-blue-300" aria-live="polite">
          {selectedCardsForPassing.length}/3 cards selected
        </div>
        {#if readyToPass}
          <div class="text-green-300 text-xs">Ready to pass!</div>
        {/if}
      </div>
    {:else if isActive}
      <div class="text-green-300 text-xs" role="status">Your turn</div>
    {/if}
  </div>
  
  <!-- Your cards (face up, interactive) -->
  <div class="flex justify-center flex-wrap" 
       role="group" 
       aria-label={passingPhase ? "Select cards to pass" : "Your hand"}>
    {#each cards as card, i}
      <div class="relative transition-all duration-200 hover:-translate-y-2" 
           style="margin-left: {i === 0 ? '0' : '-25px'}; z-index: {i};">
        <Card 
          suit={card.suit} 
          rank={card.rank} 
          faceUp={true}
          selectable={passingPhase || isActive}
          selected={isCardSelected(card)}
          on:cardSelect={handleCardSelect}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .player-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .player-container.you {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 8px 12px;
    width: fit-content;
    max-width: 90vw;
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
    margin: 0;
  }
  
  .player-name.active {
    color: rgb(251, 191, 36);
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  }
  
  .player-score {
    font-size: 12px;
    color: rgb(156, 163, 175);
  }
</style>