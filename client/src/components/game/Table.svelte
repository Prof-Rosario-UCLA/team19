<script lang="ts">
  import Card from '../cards/Card.svelte';
  import type { CardType } from '../../lib/types';
  
  export let currentTrick: { player: string, card: CardType }[] = [];
  export let trickWinner: string | null = null;
</script>

<div class="relative bg-green-800 rounded-full w-64 h-64 mx-auto my-8 shadow-inner flex items-center justify-center">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">  
    {#if currentTrick.length === 0}
      <div class="text-white text-opacity-50 text-lg">Cards played this trick will appear here</div>
    {:else}
      <div class="grid grid-cols-2 grid-rows-2 gap-4 w-full h-full p-4">
        <!-- North position -->
        {#if currentTrick[0]}
          <div class="col-span-2 flex justify-center">
            <Card suit={currentTrick[0].card.suit} rank={currentTrick[0].card.rank} />
          </div>
        {/if}
        
        <!-- West position -->
        {#if currentTrick[1]}
          <div class="flex justify-end items-center">
            <Card suit={currentTrick[1].card.suit} rank={currentTrick[1].card.rank} />
          </div>
        {/if}
        
        <!-- East position -->
        {#if currentTrick[3]}
          <div class="flex justify-start items-center">
            <Card suit={currentTrick[3].card.suit} rank={currentTrick[3].card.rank} />
          </div>
        {/if}
        
        <!-- South position -->
        {#if currentTrick[2]}
          <div class="col-span-2 flex justify-center">
            <Card suit={currentTrick[2].card.suit} rank={currentTrick[2].card.rank} />
          </div>
        {/if}
      </div>
    {/if}
    
    {#if trickWinner}
      <div class="absolute bottom-2 text-white bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm">
        {trickWinner} wins trick
      </div>
    {/if}
  </div>
</div>