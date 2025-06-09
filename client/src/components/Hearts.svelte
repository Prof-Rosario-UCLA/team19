<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { gameState, gameActions } from '../lib/stores/gameStore';
  import { availableRooms } from '../lib/stores/socket';
  import { initializeStores } from '../lib/stores/storeManager';
  import { getPlayerPosition, getCardPosition } from '../lib/utils';
  import { GamePhase } from '../../../types/game';
  import type { Card } from '../../../types/game';
  
  // Import components
  import CardComponent from './cards/CardComponent.svelte';
  import Hand from './cards/Hand.svelte';
  import ScoreBoard from './game/ScoreBoard.svelte';
  import Controls from './game/Controls.svelte';
  import WelcomeScreen from './game/WelcomeScreen.svelte';
  import AIPlayer from './players/AIPlayer.svelte';
  import HumanPlayer from './players/HumanPlayer.svelte';
  import Login from './game/Login.svelte';

  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);

  let currentUser: string | null = null;
  let showLogin = false;
  let isLoggedIn = false;
  let currentRoomId: string | null = null;
  
  // Initialize stores on mount
  onMount(() => {
    initializeStores();
  });

  // Handle card play events from player components
  function handlePlayCard(event) {
    const { card } = event.detail;
    if (currentRoomId) {
      gameActions.playCard(currentRoomId, card);
    }
  }

    // Handle human player passing selection
  function handleHumanPassingSelection(event) {
    const { ready, selectedCards } = event.detail;
    if (currentRoomId && ready) {
      gameActions.selectPassingCards(currentRoomId, selectedCards);
    }
  }
  
  // Control event handlers
  function handleStartGame() {
    initializeGame();
  }

  function handleCreateGame(event) {
    const { gameId } = event.detail;
    console.log(`Creating game with ID: ${gameId}`);
    // In a real implementation, you would:
    // 1. Create a game room on your server
    // 2. Navigate to `/game/${gameId}`
    // 3. Set up multiplayer state
    
    // For now, just start a local game
    alert(`Game created! Share this code with friends: ${gameId}\n\nURL: ${window.location.origin}/game/${gameId}`);
    initializeGame();
  }
  
  function handleJoinGame(event) {
    const { gameCode } = event.detail;
    console.log(`Joining game with code: ${gameCode}`);
    // In a real implementation, you would:
    // 1. Validate the game code with your server
    // 2. Navigate to `/game/${gameCode}`
    // 3. Join the existing game room
    
    // For now, just start a local game
    alert(`Joining game: ${gameCode}\n\nURL: ${window.location.origin}/game/${gameCode}`);
    initializeGame();
  }

  
  function handleRestartGame() {
    gameState.roundNumber = 1;
    players.forEach(player => {
      player.score = 0;
    });
    players = [...players];
    initializeGame();
  }


    // Authentication event handlers
  function handleLoginSuccess(event) {
    const { username, stats } = event.detail;
    currentUser = username;
    isLoggedIn = true;
    showLogin = false;
    console.log(`Welcome back, ${username}!`, stats);
  }
  
  function handleAccountCreated(event) {
    const { username, message } = event.detail;
    currentUser = username;
    isLoggedIn = true;
    showLogin = false;
    alert(message);
  }
  
  function handlePlayAsGuest() {
    currentUser = null;
    isLoggedIn = false;
    showLogin = false;
  }
  
  function handleShowLogin() {
    showLogin = true;
  }
  
  function handleLogout() {
    currentUser = null;
    isLoggedIn = false;
    showLogin = false;
  }

  // Reactive statements for scores
  $: scores = players.reduce((acc, player) => {
    acc[player.name] = player.score;
    return acc;
  }, {});
</script>

<!-- Main container with gradient background -->
<div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
  {#if showLogin}
    <!-- Login Screen -->
    <Login 
      on:loginSuccess={handleLoginSuccess}
      on:accountCreated={handleAccountCreated}
      on:playAsGuest={handlePlayAsGuest}
    />
  {:else if gameState.gameStarted}  
    <!-- Game Board Container -->
    <div class="relative h-screen flex flex-col">
      <div class="flex-1 relative overflow-hidden">
        <!-- Table Background with Felt Texture -->
        <div class="absolute inset-0 bg-gradient-radial from-green-600 via-green-700 to-green-800">
          <!-- Felt pattern overlay -->
          <div class="absolute inset-0 opacity-30" 
               style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px);"></div>
        </div>

        <!-- North Player (AI) -->
        <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <AIPlayer 
            playerName={players[2].name}
            cards={players[2].hand}
            isActive={gameState.currentPlayerIndex === 2}
            score={players[2].score}
            position="north"
            passingPhase={gameState.passingPhase}
            on:playCard={handlePlayCard}
            on:cardsSelectedForPassing={handleAIPassingSelection}
          />
        </div>

        <!-- West Player (AI) -->
        <div class="absolute left-8 top-1/2 transform -translate-y-1/2 z-30">
          <AIPlayer 
            playerName={players[1].name}
            cards={players[1].hand}
            isActive={gameState.currentPlayerIndex === 1}
            score={players[1].score}
            position="west"
            passingPhase={gameState.passingPhase}
            on:playCard={handlePlayCard}
            on:cardsSelectedForPassing={handleAIPassingSelection}
          />
        </div>

        <!-- East Player (AI) -->
        <div class="absolute right-8 top-1/2 transform -translate-y-1/2 z-30">
          <AIPlayer 
            playerName={players[3].name}
            cards={players[3].hand}
            isActive={gameState.currentPlayerIndex === 3}
            score={players[3].score}
            position="east"
            passingPhase={gameState.passingPhase}
            on:playCard={handlePlayCard}
            on:cardsSelectedForPassing={handleAIPassingSelection}
          />
        </div>

        <!-- Center Card Area -->
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          {#if $gameState.currentTrick.length === 0}
            <!-- Empty table message -->
            <div class="text-green-200 text-opacity-60 text-center font-medium">
              <div class="text-lg">♠ ♥ ♦ ♣</div>
              <div class="text-sm mt-1">Cards played will appear here</div>
            </div>
          {:else}
            <!-- Trick cards positioned naturally -->
            <div class="relative w-64 h-64">
              <!-- North card position -->
              {#if gameState.currentTrick.find(t => t.player === players[2].name)}
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 rotate-2">
                  <Card 
                    suit={card.suit} 
                    rank={card.rank}
                    faceUp={true}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Bottom UI Panel -->
      <div class="flex-shrink-0 bg-black bg-opacity-30 backdrop-blur-sm border-t border-white border-opacity-20">
        <div class="max-w-6xl mx-auto p-4">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <!-- Controls -->
            <div class="order-2 lg:order-1">
              <Controls 
                gameStarted={gameState.gameStarted} 
                gameOver={gameState.gameOver} 
                passingPhase={gameState.passingPhase}
                waitingForPlay={gameState.currentPlayerIndex !== 0 && !gameState.passingPhase}
                on:startGame={handleStartGame}
                on:restartGame={handleRestartGame}
                on:passDone={handlePassDone}
              />
              
              {#if gameState.passingPhase}
                <div class="mt-2 text-center">
                  <p class="text-green-200 text-sm mb-2">
                    Select 3 cards to pass {passingDirection}
                  </p>
                  <button 
                    class="px-4 py-2 {humanReadyToPass ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 cursor-not-allowed'} 
                           text-white rounded-lg transition-all transform hover:scale-105 shadow-lg"
                    disabled={!humanReadyToPass}
                    on:click={handlePassDone}
                  >
                    Confirm Pass ({humanSelectedCards.length}/3)
                  </button>
                </div>
              {/if}
            </div>

            <!-- Game Status with Title -->
            <div class="order-1 lg:order-2 text-center">
              <div class="bg-black bg-opacity-40 rounded-lg p-3">
                <!-- Hearts Title moved here -->
                <div class="mb-3">
                  <h1 class="text-xl font-bold text-white mb-1">♠ Hearts ♥</h1>
                  <div class="text-green-200 text-xs flex items-center justify-center gap-2">
                    <span>Hand {$gameState.handNumber}</span>
                    <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                    {#if $gameState.gamePhase === GamePhase.PASSING}
                      <span class="text-yellow-300">Passing Phase</span>
                    {:else}
                      <span class="text-white font-medium">{$gameState.players[$gameState.currentPlayerTurn].name}'s Turn</span>
                    {/if}
                  </div>
                </div>
                
                <!-- Game Status -->
                <div class="text-white text-sm space-y-1 border-t border-white border-opacity-20 pt-2">
                  {#if $gameState.gamePhase === GamePhase.PASSING}
                    <div class="text-yellow-300 font-medium">Passing Phase</div>
                    <div class="text-green-200">Choose 3 cards to pass</div>
                  {:else if $gameState.currentPlayerTurn !== 0}
                    <div class="text-blue-300 font-medium">Waiting...</div>
                    <div class="text-green-200">{$gameState.players[$gameState.currentPlayerTurn].name} is playing</div>
                  {:else}
                    <div class="text-green-300 font-medium">Your Turn</div>
                    <div class="text-green-200">Choose a card to play</div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Scoreboard using component -->
            <div class="order-3">
              <ScoreBoard 
                scores={$gameState.players.reduce((acc, player) => {
                  acc[player.name] = player.score;
                  return acc;
                }, {})}
                roundNumber={$gameState.handNumber}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

  {:else}
    <!-- Welcome Screen Component -->
    <WelcomeScreen 
      currentUser={currentUser}
      on:startGame={handleStartGame}
      rooms={$availableRooms}
      on:createGame={handleCreateGame}
      on:joinGame={handleJoinGame}
      on:showLogin={handleShowLogin}
      on:logout={handleLogout}
    />
  {/if}
</div>
 
<style>
  /* Background gradients */
  .bg-gradient-radial {
    background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
  }
 
  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .absolute.left-8,
    .absolute.right-8 {
      top: 20%;
    }
  }
</style>