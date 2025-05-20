<script lang="ts">
  console.log("Hand component loaded");
  import Card from './Card.svelte';
  import type { CardType } from '../../lib/types';
  import { createEventDispatcher } from 'svelte';
  
  export let cards: CardType[] = [];
  export let playable: boolean = false;
  export let isCurrentPlayer: boolean = false;
  export let isCurrentUser: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function handleCardSelect(event) {
    if (isCurrentPlayer && playable) {
      dispatch('playCard', event.detail);
    }
  }
</script>
<div class="relative h-40 my-5 min-w-[120px] {isCurrentPlayer ? 'ring-2 ring-yellow-400 rounded-lg' : ''}">
  {#if cards.length > 0}
    {#if isCurrentUser}
      <!-- Current User sees face-up cards -->
      {#each cards as card, i}
        <div class="absolute transition-all duration-200" style="left: {i * 25}px;">
          <Card 
            suit={card.suit} 
            rank={card.rank} 
            selectable={isCurrentPlayer && playable} 
            on:cardSelect={handleCardSelect} 
          />
        </div>
      {/each}
    {:else}
      <!-- Other player cards are face down -->
      {#each Array(Math.min(7, cards.length)) as _, i}
        <div class="absolute transition-all duration-200" style="left: {i * 15}px;">
          <Card 
            suit="spades" 
            rank={2} 
            faceUp={false}
          />
        </div>
      {/each}
      {#if cards.length > 7}
        <div class="absolute transition-all duration-200 flex items-center text-sm text-gray-500" style="left: {7 * 15 + 10}px;">
          +{cards.length - 7}
        </div>
      {/if}
    {/if}
  {:else}
    <div class="flex items-center justify-center h-full text-gray-500">
      No cards
    </div>
  {/if}
</div>