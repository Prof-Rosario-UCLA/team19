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
  setContext('cardWidth', 80);
  setContext('cardHeight', 120);
  
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
          trickWinner = null;
          currentPlayerIndex = players.indexOf(trickWinner);
          
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
  
  // Card is selected check
  function isCardSelected(player, card) {
    return selectedCards[player].some(c => c.suit === card.suit && c.rank === card.rank);
  }
  
  // Human ready to pass check
  $: humanReadyToPass = passingPhase && selectedCards['You'].length === 3;
</script>

<div class="min-h-screen bg-gray-100 py-8">
  <div class="max-w-5xl mx-auto px-4">
    <header class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Hearts</h1>
      {#if gameStarted}
        <p class="text-gray-600 mt-1">
          Round {roundNumber} - 
          {#if passingPhase}
            Pass {passingDirection}
          {:else}
            {players[currentPlayerIndex]}'s Turn
          {/if}
        </p>
      {/if}
    </header>
    
    {#if gameStarted}
      <div class="grid grid-cols-1 gap-6">
        <!-- North player -->
        <div class="order-1">
          <Player 
            name={players[2]} 
            isCurrentUser={false} 
            cards={hands[players[2]] || []} 
            score={scores[players[2]] || 0}
            isCurrentPlayer={currentPlayerIndex === 2 && !passingPhase}
          />
        </div>
        
        <!-- Middle row with West, Table, East -->
        <div class="order-2 flex items-center">
          <!-- West player -->
          <div class="w-1/4">
            <Player 
              name={players[1]} 
              isCurrentUser={false} 
              cards={hands[players[1]] || []} 
              score={scores[players[1]] || 0}
              isCurrentPlayer={currentPlayerIndex === 1 && !passingPhase}
            />
          </div>
          
          <!-- Table -->
          <div class="flex-1">
            <Table currentTrick={currentTrick} trickWinner={trickWinner} />
          </div>
          
          <!-- East player -->
          <div class="w-1/4">
            <Player 
              name={players[3]} 
              isCurrentUser={false} 
              cards={hands[players[3]] || []} 
              score={scores[players[3]] || 0}
              isCurrentPlayer={currentPlayerIndex === 3 && !passingPhase}
            />
          </div>
        </div>
        
        <!-- Human player -->
        <div class="order-3">
          <div class="bg-white rounded-lg shadow-md p-4 mb-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-bold text-lg {currentPlayerIndex === 0 && !passingPhase ? 'text-yellow-600' : 'text-gray-700'}">{players[0]}</h3>
              <span class="font-medium text-gray-600">Score: {scores[players[0]] || 0}</span>
            </div>
            
            <Hand 
            cards={hands[players[0]] || []}
            playable={currentPlayerIndex === 0 && !passingPhase}
            isCurrentPlayer={currentPlayerIndex === 0}
            isCurrentUser={true} 
            on:playCard={(event) => {
                if (!passingPhase) {
                handlePlayCard(event);
                } else {
                handleCardSelect({ detail: { player: players[0], card: event.detail } });
                }
            }}
            />
          </div>
        </div>
        
        <!-- Controls and scoreboard -->
        <div class="order-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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
                <p class="text-sm text-gray-600 mb-2">
                  Select 3 cards to pass {passingDirection}
                </p>
                <button 
                  class="px-4 py-2 {humanReadyToPass ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} 
                         text-white rounded-md transition-colors"
                  disabled={!humanReadyToPass}
                  on:click={handlePassDone}
                >
                  Confirm Pass
                </button>
              </div>
            {/if}
          </div>
          
          <div>
            <ScoreBoard scores={scores} roundScores={roundScores} roundNumber={roundNumber} />
          </div>
        </div>
      </div>
    {:else}
      <div class="text-center p-10 bg-white rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4">Welcome to Hearts!</h2>
        <p class="text-gray-600 mb-8">
          Hearts is a trick-taking card game for 4 players. The goal is to avoid taking hearts and the Queen of Spades.
        </p>
        
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-2">Game Rules:</h3>
          <ul class="text-left max-w-md mx-auto text-sm text-gray-700 space-y-1">
            <li>• Each player is dealt 13 cards</li>
            <li>• In the first three rounds, players pass 3 cards to another player</li>
            <li>• The player with the 2 of clubs leads the first trick</li>
            <li>• Players must follow suit if possible</li>
            <li>• The highest card of the led suit wins the trick</li>
            <li>• Each heart is worth 1 point, and the Queen of Spades is worth 13 points</li>
            <li>• The game ends when a player reaches 100 points</li>
            <li>• The player with the lowest score wins</li>
          </ul>
        </div>
        
        <button 
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md transition-colors text-lg"
          on:click={handleStartGame}
        >
          Start Game
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .card-wrapper {
    max-width: 50px;
  }
  
  /* Make the cards fan out nicely */
  @media (min-width: 640px) {
    .card-wrapper {
      max-width: unset;
    }
  }
</style>