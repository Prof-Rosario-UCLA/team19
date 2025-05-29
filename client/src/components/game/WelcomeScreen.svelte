<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Leaderboard from '../game/Leaderboard.svelte';
  
  export let currentUser: string | null = null;

  const dispatch = createEventDispatcher();
  
  let gameCode = '';
  let showJoinInput = false;
  
  function startLocalGame() {
    dispatch('startGame');
  }
  
  function createGame() {
    // Generate a unique game code (6 characters)
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    dispatch('createGame', { gameId });
  }
  
  function toggleJoinInput() {
    showJoinInput = !showJoinInput;
    if (!showJoinInput) {
      gameCode = '';
    }
  }
  
  function joinGame() {
    if (gameCode.trim().length >= 4) {
      dispatch('joinGame', { gameCode: gameCode.trim().toUpperCase() });
    }
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter') {
      joinGame();
    }
  }

  function logout() {
    dispatch('logout');
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

<div class="min-h-screen relative">
  <!-- Leaderboard in top right -->
  <div class="absolute top-4 right-4 z-10">
    <Leaderboard currentUser={currentUser} />
  </div>

  <!-- User info and logout in top left (if logged in) -->
  {#if currentUser}
    <div class="absolute top-4 left-4 z-10">
      <div class="bg-black bg-opacity-40 rounded-lg p-3 text-white">
        <div class="text-sm">
          <div class="text-green-300 font-medium">Welcome back!</div>
          <div class="text-white">{currentUser}</div>
          <button 
            on:click={logout}
            class="text-xs text-gray-300 hover:text-white transition-colors mt-1"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">

        <!-- Header Section -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
          <p class="text-gray-600 text-lg">The Classic Card Game</p>
          {#if currentUser}
            <p class="text-green-600 text-sm mt-2">Logged in as {currentUser}</p>
          {/if}
        </div>
        
        <!-- Game Options Section -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 text-gray-800 text-center">Game Options:</h3>
          <div class="grid gap-4 mb-6">
            <!-- Local Game Button -->
            <button 
              class="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
              on:click={startLocalGame}
            >
              🎮 Play Local Game
            </button>
            
            <!-- Create Online Game Button -->
            <button 
              class="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
              on:click={createGame}
            >
              🌐 Create Online Game
            </button>
            
            <!-- Join Game Section -->
            <div class="space-y-3">
              <button 
                class="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
                on:click={toggleJoinInput}
              >
                🔗 Join Game
              </button>
              
              {#if showJoinInput}
                <div class="bg-gray-50 p-4 rounded-xl border-2 border-purple-200 transition-all duration-300">
                  <label for="gameCode" class="block text-sm font-medium text-gray-700 mb-2">
                    Enter Game Code:
                  </label>
                  <div class="flex gap-2">
                    <input
                      id="gameCode"
                      type="text"
                      bind:value={gameCode}
                      on:keydown={handleKeydown}
                      placeholder="ABCD12"
                      maxlength="8"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase text-center font-mono text-lg"
                      style="text-transform: uppercase;"
                    />
                    <button
                      on:click={joinGame}
                      disabled={gameCode.trim().length < 4}
                      class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                      Join
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">
                    Game codes are typically 4-8 characters long
                  </p>
                </div>
              {/if}
            </div>
          </div>
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
        
        <!-- Footer Info -->
        <div class="text-center text-xs text-gray-500">
          <p>Local games work offline • Online games connect you with other players</p>
          {#if !currentUser}
            <p class="mt-1">
              <button 
                on:click={() => dispatch('showLogin')}
                class="text-green-600 hover:text-green-700 font-medium"
              >
                Create an account
              </button> 
              to save your stats and compete on the leaderboard!
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>