<script lang="ts">
  import { onMount, setContext } from 'svelte';
  
  // Import components
  import Card from './cards/Card.svelte';
  import Hand from './cards/Hand.svelte'
  import Player from './players/Player.svelte';
  import Table from './game/Table.svelte';
  import ScoreBoard from './game/ScoreBoard.svelte';
  import Controls from './game/Controls.svelte';
  
  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);
  
  // Basic game state
  let gameStarted = false;
  let gameOver = false;
  let roundNumber = 1;
  let passingDirection = 'left'; // 'left', 'right', 'across', 'none'
  let passingPhase = false;
  
  // Player state
  const players = ['You', 'West', 'North', 'East'];
  let currentPlayerIndex = 0;
  let hands = {}; // Stores cards for each player
  let selectedCards = {}; // For card passing
  let scores = {};
  let roundScores = {};
  
  // Trick state
  let currentTrick = [];
  let trickWinner = null;
  
  // Initialize player data
  players.forEach(player => {
    scores[player] = 0;
    roundScores[player] = 0;
    selectedCards[player] = [];
  });
  
  // Deal cards to players (just visual setup)
  function dealCards() {
    // Create a full deck of cards
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    
    let deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({ suit, rank });
      });
    });
    
    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Deal 13 cards to each player
    hands = {};
    players.forEach((player, index) => {
      hands[player] = deck.slice(index * 13, (index + 1) * 13);
      
      // Sort the hands for easier play
      hands[player].sort((a, b) => {
        const suitOrder = { 'clubs': 0, 'diamonds': 1, 'spades': 2, 'hearts': 3 };
        const rankOrder = { 
          2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 
          'J': 11, 'Q': 12, 'K': 13, 'A': 14 
        };
        
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return rankOrder[a.rank] - rankOrder[b.rank];
      });
    });
  }
  
  // Initialize the game (visual only)
  function initializeGame() {
    gameStarted = true;
    gameOver = false;
    currentTrick = [];
    trickWinner = null;
    
    // Reset round scores
    players.forEach(player => {
      roundScores[player] = 0;
      selectedCards[player] = [];
    });
    
    // Deal cards
    dealCards();
    
    // Set passing direction based on round number
    switch ((roundNumber - 1) % 4) {
      case 0: passingDirection = 'left'; break;
      case 1: passingDirection = 'right'; break;
      case 2: passingDirection = 'across'; break;
      case 3: passingDirection = 'none'; break;
    }
    
    passingPhase = passingDirection !== 'none';
    
    // Set first player
    currentPlayerIndex = 0;
  }
  
  // Simple card selection (for passing phase)
  function handleCardSelect(event) {
    const { player, card } = event.detail;
    
    if (passingPhase) {
      // For passing phase, allow selecting up to 3 cards
      const selectedCardsList = selectedCards[player];
      const cardIndex = selectedCardsList.findIndex(c => 
        c.suit === card.suit && c.rank === card.rank
      );
      
      if (cardIndex === -1) {
        // Add card if not already selected and less than 3 cards selected
        if (selectedCardsList.length < 3) {
          selectedCardsList.push(card);
        }
      } else {
        // Remove card if already selected
        selectedCardsList.splice(cardIndex, 1);
      }
      
      // Update the state
      selectedCards = { ...selectedCards };
    }
  }
  
  // Simple card play (for UI only, no game logic)
  function handlePlayCard(event) {
    const { player, card } = event.detail;
    
    if (passingPhase || gameOver) return;
    
    // Only allow the current player to play
    if (player !== players[currentPlayerIndex]) return;
    
    // Find the card in the player's hand
    const playerHand = hands[player];
    const cardIndex = playerHand.findIndex(c => 
      c.suit === card.suit && c.rank === card.rank
    );
    
    if (cardIndex === -1) return;
    
    // Remove card from hand
    hands[player].splice(cardIndex, 1);
    hands = { ...hands };
    
    // Add card to current trick
    currentTrick = [...currentTrick, { player, card }];
    
    // Move to next player (simple turn cycling)
    currentPlayerIndex = (currentPlayerIndex + 1) % 4;
    
    // Simple trick completion (no scoring logic)
    if (currentTrick.length === 4) {
      setTimeout(() => {
        trickWinner = currentTrick[0].player; // Always set first player as winner for simplicity
        
        setTimeout(() => {
          currentTrick = [];
          const winner = trickWinner; // Store trickWinner in a temporary variable
          trickWinner = null;
          currentPlayerIndex = players.indexOf(winner); // Use the temporary variable
          // Check if round is over (all cards played)
          if (Object.values(hands).every(hand => hand.length === 0)) {
            roundNumber++;
            setTimeout(initializeGame, 2000);
          }
        }, 2000);
      }, 1000);
    }
  }
  
  // Simple pass action (no passing logic)
  function handlePassDone() {
    passingPhase = false;
    
    // Clear selected cards
    players.forEach(player => {
      selectedCards[player] = [];
    });
    selectedCards = { ...selectedCards };
  }
  
  // Control event handlers
  function handleStartGame() {
    initializeGame();
  }
  
  function handleRestartGame() {
    roundNumber = 1;
    players.forEach(player => {
      scores[player] = 0;
    });
    scores = { ...scores };
    initializeGame();
  }


  // Updated Card component to handle both playCard and cardSelect properly

  function handleCardClick(event) {

    const { player, card } = event.detail;

    

    if (passingPhase) {

      handleCardSelect(event);

    } else if (currentPlayerIndex === 0 && !passingPhase) {

      handlePlayCard(event);

    }

  }

  
  // Card is selected check
  function isCardSelected(player, card) {
    return selectedCards[player].some(c => c.suit === card.suit && c.rank === card.rank);
  }
  
  // Human ready to pass check
  $: humanReadyToPass = passingPhase && selectedCards['You'].length === 3;
</script>

<!-- Main container with gradient background -->
<div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
  {#if gameStarted}
    <!-- Game Board Container -->
    <div class="relative h-screen flex flex-col">
      <!-- Header -->
      <div class="flex-shrink-0 text-center py-4 bg-black bg-opacity-20">
        <h1 class="text-2xl font-bold text-white mb-1">♠ Hearts ♥</h1>
        <div class="text-green-200 text-sm flex items-center justify-center gap-4">
          <span>Round {roundNumber}</span>
          <span class="w-1 h-1 bg-green-400 rounded-full"></span>
          {#if passingPhase}
            <span class="text-yellow-300">Pass {passingDirection}</span>
          {:else}
            <span class="text-white font-medium">{players[currentPlayerIndex]}'s Turn</span>
          {/if}
        </div>
      </div>

      <!-- Game Area -->
      <div class="flex-1 relative overflow-hidden">
        <!-- Table Background with Felt Texture -->
        <div class="absolute inset-0 bg-gradient-radial from-green-600 via-green-700 to-green-800">
          <!-- Felt pattern overlay -->
          <div class="absolute inset-0 opacity-30" 
               style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px);"></div>
        </div>

        <!-- North Player -->
        <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div class="player-container north">
            <div class="player-info mb-2">
              <div class="player-name {currentPlayerIndex === 2 && !passingPhase ? 'active' : ''}">{players[2]}</div>
              <div class="player-score">Score: {scores[players[2]] || 0}</div>
            </div>
            <div class="hand-container">
              <Hand 
                cards={hands[players[2]] || []} 
                playable={false}
                isCurrentPlayer={currentPlayerIndex === 2 && !passingPhase}
                isCurrentUser={false}
              />
            </div>
          </div>
        </div>

        <!-- West Player -->
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div class="player-container west">
            <div class="player-info">
              <div class="player-name {currentPlayerIndex === 1 && !passingPhase ? 'active' : ''}">{players[1]}</div>
              <div class="player-score">Score: {scores[players[1]] || 0}</div>
            </div>
            <div class="hand-container vertical">
              <Hand 
                cards={hands[players[1]] || []} 
                playable={false}
                isCurrentPlayer={currentPlayerIndex === 1 && !passingPhase}
                isCurrentUser={false}
              />
            </div>
          </div>
        </div>

        <!-- East Player -->
        <div class="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
          <div class="player-container east">
            <div class="player-info">
              <div class="player-name {currentPlayerIndex === 3 && !passingPhase ? 'active' : ''}">{players[3]}</div>
              <div class="player-score">Score: {scores[players[3]] || 0}</div>
            </div>
            <div class="hand-container vertical">
              <Hand 
                cards={hands[players[3]] || []} 
                playable={false}
                isCurrentPlayer={currentPlayerIndex === 3 && !passingPhase}
                isCurrentUser={false}
              />
            </div>
          </div>
        </div>

        <!-- Center Card Area -->
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          {#if currentTrick.length === 0}
            <!-- Empty table message -->
            <div class="text-green-200 text-opacity-60 text-center font-medium">
              <div class="text-lg">♠ ♥ ♦ ♣</div>
              <div class="text-sm mt-1">Cards played will appear here</div>
            </div>
          {:else}
            <!-- Trick cards positioned naturally -->
            <div class="relative w-64 h-64">
              <!-- North card position -->
              {#if currentTrick.find(t => t.player === players[2])}
                <div class="absolute top-0 left-1/2 transform -translate-x-1/2 rotate-2">
                  <Card 
                    suit={currentTrick.find(t => t.player === players[2]).card.suit} 
                    rank={currentTrick.find(t => t.player === players[2]).card.rank}
                    faceUp={true}
                  />
                </div>
              {/if}
              
              <!-- West card position -->
              {#if currentTrick.find(t => t.player === players[1])}
                <div class="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-1">
                  <Card 
                    suit={currentTrick.find(t => t.player === players[1]).card.suit} 
                    rank={currentTrick.find(t => t.player === players[1]).card.rank}
                    faceUp={true}
                  />
                </div>
              {/if}
              
              <!-- East card position -->
              {#if currentTrick.find(t => t.player === players[3])}
                <div class="absolute right-0 top-1/2 transform -translate-y-1/2 rotate-1">
                  <Card 
                    suit={currentTrick.find(t => t.player === players[3]).card.suit} 
                    rank={currentTrick.find(t => t.player === players[3]).card.rank}
                    faceUp={true}
                  />
                </div>
              {/if}
              
              <!-- South card position (You) -->
              {#if currentTrick.find(t => t.player === players[0])}
                <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 -rotate-2">
                  <Card 
                    suit={currentTrick.find(t => t.player === players[0]).card.suit} 
                    rank={currentTrick.find(t => t.player === players[0]).card.rank}
                    faceUp={true}
                  />
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- Trick winner announcement -->
          {#if trickWinner}
            <div class="absolute -bottom-12 left-1/2 transform -translate-x-1/2 
                        bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium
                        animate-pulse">
              {trickWinner} wins trick
            </div>
          {/if}        
        </div>
        
        <!-- South Player (You) -->
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div class="player-container south you">
            <div class="player-info">
              <div class="player-name {currentPlayerIndex === 0 && !passingPhase ? 'active' : ''}">{players[0]}</div>
              <div class="player-score">Score: {scores[players[0]] || 0}</div>
            </div>

            
            <!-- Your cards (face up) -->
            <div class="flex justify-center">
              {#each (hands[players[0]] || []) as card, i}
                <div class="relative transition-all duration-200 hover:-translate-y-2" 
                     style="margin-left: {i === 0 ? '0' : '-25px'}; z-index: {i};">
                  <Card 
                    suit={card.suit} 
                    rank={card.rank} 
                    faceUp={true}
                    selectable={passingPhase}
                    selected={isCardSelected(players[0], card)}
                    on:cardSelect={(event) => {
                      if (passingPhase) {
                        handleCardSelect({ detail: { player: players[0], card: event.detail } });
                      } else {
                        handlePlayCard({ detail: { player: players[0], card: event.detail } });
                      }
                    }}
                  />
                </div>
              {/each}


            </div>
          </div>
        </div>
      </div>

      <!-- Bottom UI Panel -->
      <div class="flex-shrink-0 bg-black bg-opacity-30 backdrop-blur-sm border-t border-white border-opacity-20">
        <div class="max-w-6xl mx-auto p-4">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <!-- Controls -->
            <div class="order-2 lg:order-1">
              <Controls 
                gameStarted={gameStarted} 
                gameOver={gameOver} 
                passingPhase={passingPhase}
                waitingForPlay={currentPlayerIndex !== 0 && !passingPhase}
                on:startGame={handleStartGame}
                on:restartGame={handleRestartGame}
                on:passDone={handlePassDone}
              />
              
              {#if passingPhase}
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
                    Confirm Pass
                  </button>
                </div>
              {/if}
            </div>

            <!-- Game Status -->
            <div class="order-1 lg:order-2 text-center">
              <div class="bg-black bg-opacity-40 rounded-lg p-3">
                <div class="text-white text-sm space-y-1">
                  {#if passingPhase}
                    <div class="text-yellow-300 font-medium">Passing Phase</div>
                    <div class="text-green-200">Choose 3 cards to pass {passingDirection}</div>
                  {:else if currentPlayerIndex !== 0}
                    <div class="text-blue-300 font-medium">Waiting...</div>
                    <div class="text-green-200">{players[currentPlayerIndex]} is playing</div>
                  {:else}
                    <div class="text-green-300 font-medium">Your Turn</div>
                    <div class="text-green-200">Choose a card to play</div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Compact Scoreboard -->
            <div class="order-3">
              <div class="bg-black bg-opacity-40 rounded-lg p-3">
                <div class="text-white text-xs">
                  <div class="font-medium mb-2 text-center">Scores</div>
                  <div class="grid grid-cols-2 gap-1 text-xs">
                    {#each players as player}
                      <div class="flex justify-between">
                        <span class="{player === 'You' ? 'text-yellow-300' : 'text-green-200'}">{player}:</span>
                        <span class="text-white">{scores[player] || 0}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  {:else}
    <!-- Welcome Screen -->
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="max-w-2xl mx-auto">
        <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
            <p class="text-gray-600 text-lg">The Classic Card Game</p>
          </div>
          
          <div class="mb-8">
            <h3 class="text-xl font-semibold mb-4 text-gray-800">Game Rules:</h3>
            <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div class="space-y-2">
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-bold">•</span>
                  <span>Each player gets 13 cards</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-bold">•</span>
                  <span>Pass 3 cards each round</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-bold">•</span>
                  <span>2 of clubs leads first trick</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-bold">•</span>
                  <span>Must follow suit if possible</span>
                </div>
              </div>
              <div class="space-y-2">
                <div class="flex items-start gap-2">
                  <span class="text-red-600 font-bold">•</span>
                  <span>Each heart = 1 point</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-red-600 font-bold">•</span>
                  <span>Queen of spades = 13 points</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-red-600 font-bold">•</span>
                  <span>Game ends at 100 points</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-red-600 font-bold">•</span>
                  <span>Lowest score wins!</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="text-center">
            <button 
              class="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
              on:click={handleStartGame}
            >
              🎮 Start Game!
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Player containers */
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
    /* Adjust width to fit cards better */
    width: fit-content;
    max-width: 90vw;
  }

  /* Player info */
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
  
  /* Ensure horizontal text for side players */
  .player-info-horizontal {
    writing-mode: horizontal-tb;
    text-orientation: mixed;
  }

  .player-name {
    font-weight: 600;
    font-size: 14px;
    color: rgb(209, 213, 219);
    transition: all 0.3s ease;
  }
  
  .player-name.active {
    color: rgb(251, 191, 36);
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  }
  
  .player-score {
    font-size: 12px;
    color: rgb(156, 163, 175);
  }

  /* Hand containers */
  .hand-container {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Only apply vertical writing to the hand area for card stacking */
  .hand-container.hand-vertical {
    writing-mode: horizontal-tb;
    /* Cards will stack vertically but text stays horizontal */
  }

  /* Background gradients */
  .bg-gradient-radial {
    background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .player-container.west,
    .player-container.east {
      position: absolute;
      top: 20%;
    }
    
    .player-container.west {
      left: 8px;
    }
    
    .player-container.east {
      right: 8px;
    }
  }

  @media (max-width: 768px) {
    .player-info {
      padding: 6px 8px;
    }
    
    .player-name {
      font-size: 12px;
    }
    
    .player-score {
      font-size: 10px;
    }
  }
</style>