<script lang="ts">
  console.log("Hand component loaded");
  import Card from './Card.svelte';
  import type { CardType } from '../../lib/types';
  import { createEventDispatcher } from 'svelte';
  
  export let cards: CardType[] = [];
  export let playable: boolean = false;
  export let isCurrentPlayer: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function handleCardSelect(event) {
    if (isCurrentPlayer && playable) {
      dispatch('playCard', event.detail);
    }
  }
</script>

<div class="relative h-40 my-5 min-w-[120px] {isCurrentPlayer ? 'ring-2 ring-yellow-400 rounded-lg' : ''}">
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
</div>