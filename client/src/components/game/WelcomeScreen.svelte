<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  function startGame() {
    dispatch('startGame');
  }
  
  // Game rules data for easier modification
  const gameRules = {
    basic: [
      "Each player gets 13 cards",
      "Pass 3 cards each round",
      "2 of clubs leads first trick",
      "Must follow suit if possible"
    ],
    scoring: [
      "Each heart = 1 point",
      "Queen of spades = 13 points", 
      "Game ends at 100 points",
      "Lowest score wins!"
    ]
  };
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="max-w-2xl mx-auto">
    <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
      <!-- Header Section -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
        <p class="text-gray-600 text-lg">The Classic Card Game</p>
      </div>
      
      <!-- Rules Section -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4 text-gray-800">Game Rules:</h3>
        <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <!-- Basic Rules -->
          <div class="space-y-2">
            {#each gameRules.basic as rule}
              <div class="flex items-start gap-2">
                <span class="text-green-600 font-bold">•</span>
                <span>{rule}</span>
              </div>
            {/each}
          </div>
          
          <!-- Scoring Rules -->
          <div class="space-y-2">
            {#each gameRules.scoring as rule}
              <div class="flex items-start gap-2">
                <span class="text-red-600 font-bold">•</span>
                <span>{rule}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
      
      <!-- Start Button -->
      <div class="text-center">
        <button 
          class="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
          on:click={startGame}
        >
          🎮 Start Game!
        </button>
      </div>
    </div>
  </div>
</div>