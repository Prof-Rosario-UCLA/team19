<script lang="ts">
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
      class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors"
    >
      Start Game
    </button>
  {:else if gameOver}
    <button 
      on:click={restartGame}
      class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors"
    >
      Play Again
    </button>
  {:else if passingPhase}
    <button 
      on:click={passDone}
      class="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors"
    >
      Confirm Pass
    </button>
  {:else if waitingForPlay}
    <div class="animate-pulse text-gray-700 font-medium">
      Waiting for play...
    </div>
  {/if}
</div>