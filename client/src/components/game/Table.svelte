<script lang="ts">
  console.log("Table component loaded");

  import Card from '../cards/Card.svelte';
  import type { CardType } from '../../lib/types';
  
  export let currentTrick: { player: string, card: CardType }[] = [];
  export let trickWinner: string | null = null;
</script>

<div class="relative mx-auto my-8">
  <!-- Table surface with wood rim -->
  <div class="relative w-72 h-72 mx-auto rounded-full overflow-hidden border-8 border-amber-800 shadow-xl">
    <!-- Felt texture -->
    <div class="absolute inset-0 bg-green-800 shadow-inner">
      <!-- Table felt pattern -->
      <div class="absolute inset-0 opacity-10" 
           style="background-image: radial-gradient(circle, transparent 20%, #000 20%, #000 21%, transparent 21%), 
                  radial-gradient(circle, transparent 20%, #000 20%, #000 21%, transparent 21%);
                  background-size: 8px 8px;
                  background-position: 0 0, 4px 4px;">
      </div>
    </div>
    
    <!-- Table shine/highlight -->
    <div class="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-5"></div>
    
    <!-- Table center decoration -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-amber-700 border-opacity-30">
      <div class="absolute inset-0 rounded-full bg-green-700"></div>
    </div>
    
    <!-- Playing area -->
    <div class="absolute inset-0 flex items-center justify-center">
      {#if currentTrick.length === 0}
        <div class="text-white text-opacity-50 text-lg px-8 text-center">Cards played will appear here</div>
      {:else}
        <!-- Card positions - more natural layout -->
        <div class="absolute inset-0">
          <!-- North position (slightly tilted) -->
          {#if currentTrick[0]}
            <div class="absolute top-3 left-1/2 -translate-x-1/2 transform -rotate-1">
              <Card suit={currentTrick[0].card.suit} rank={currentTrick[0].card.rank} />
            </div>
          {/if}
          
          <!-- West position (slightly tilted) -->
          {#if currentTrick[1]}
            <div class="absolute top-1/2 left-3 -translate-y-1/2 transform rotate-2">
              <Card suit={currentTrick[1].card.suit} rank={currentTrick[1].card.rank} />
            </div>
          {/if}
          
          <!-- East position (slightly tilted) -->
          {#if currentTrick[3]}
            <div class="absolute top-1/2 right-3 -translate-y-1/2 transform -rotate-2">
              <Card suit={currentTrick[3].card.suit} rank={currentTrick[3].card.rank} />
            </div>
          {/if}
          
          <!-- South position (slightly tilted) -->
          {#if currentTrick[2]}
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 transform rotate-1">
              <Card suit={currentTrick[2].card.suit} rank={currentTrick[2].card.rank} />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Table rim shadow -->
  <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-64 h-6 bg-black opacity-20 blur-md rounded-full"></div>
  

  
  {#if trickWinner}
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-full text-white bg-black bg-opacity-70 px-3 py-1 rounded-full text-sm">
      {trickWinner} wins trick
    </div>
  {/if}
</div>