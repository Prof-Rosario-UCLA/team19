<script lang="ts">
  console.log("Controls component loaded");

  export let gameStarted: boolean = false;
  export let gameOver: boolean = false;
  export let passingPhase: boolean = false;
  export let waitingForPlay: boolean = false;
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  function startGame() {
    dispatch('startGame');
  }
  
  function restartGame() {
    dispatch('restartGame');
  }
  
  function passDone() {
    dispatch('passDone');
  }
</script>

<div class="flex justify-center gap-4 my-4">
  {#if !gameStarted}
    <button 
      on:click={startGame}
      class="bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-colors"
      aria-label="Start new Hearts game"
    >
      🎮 Start Game
    </button>
  {:else if gameOver}
    <button 
      on:click={restartGame}
      class="bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-colors"
      aria-label="Start new game with reset scores"
    >
      🔄 Play Again
    </button>
  {:else if passingPhase}
    <button 
      on:click={passDone}
      class="bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-300 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-colors"
      aria-label="Confirm selected cards for passing"
    >
      ✓ Confirm Pass
    </button>
  {:else if waitingForPlay}
    <div class="flex items-center gap-3 px-6 py-3" 
         role="status" 
         aria-label="Waiting for other players to play">
      <div class="animate-pulse w-3 h-3 bg-amber-500 rounded-full"></div>
      <span class="text-gray-800 font-medium">Waiting for play...</span>
    </div>
  {/if}
</div>

<style>
  /* Ensure minimum touch target size */
  button {
    min-height: 44px;
    min-width: 44px;
  }
</style>