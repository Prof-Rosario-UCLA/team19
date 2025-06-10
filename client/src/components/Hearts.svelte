<script lang="ts">
  import { onMount, setContext } from 'svelte';

  // Import components
  import Card from './cards/Card.svelte';
  import Hand from './cards/Hand.svelte';
  import ScoreBoard from './game/ScoreBoard.svelte';
  import Controls from './game/Controls.svelte';
  import WelcomeScreen from './game/WelcomeScreen.svelte';
  import AIPlayer from './players/AIPlayer.svelte';
  import HumanPlayer from './players/HumanPlayer.svelte';
  import Login from './game/Login.svelte';
  import type { CardType, PlayerType, GameState } from '../lib/types.ts';

  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);

  // User and authentication state
  let currentUser: any = null; // Changed from string to object to hold full user data
  let authToken: string | null = null;
  let showLogin = false;
  let isLoggedIn = false;

  // Game state
  let gameState: GameState = {
    gameStarted: false,
    gameOver: false,
    roundNumber: 1,
    passingDirection: 'left',
    passingPhase: false,
    currentPlayerIndex: 0,
    players: ['You', 'West', 'North', 'East'],
    hands: {},
    scores: {},
    roundScores: {},
    currentTrick: [],
    trickWinner: null,
    heartsBroken: false
  };

  let passingDirection = 'left'; // 'left', 'right', 'across', 'none'

  // Player data
  let players: PlayerType[] = [
    { name: 'You', hand: [], score: 0, isHuman: true },
    { name: 'West', hand: [], score: 0, isHuman: false },
    { name: 'North', hand: [], score: 0, isHuman: false },
    { name: 'East', hand: [], score: 0, isHuman: false }
  ];

  let roundScores = {};
  let humanReadyToPass = false;
  let humanSelectedCards: CardType[] = [];
  let aiPassingComplete = false;

  // Helper function to make authenticated API calls
  function makeAuthenticatedRequest(url: string, options: any = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }

  // Check for existing auth token on load
  function checkExistingAuth() {
    const token = localStorage.getItem('hearts_token');
    if (token) {
      authToken = token;
      // Could validate token with server here
      // For now, just assume it's valid
    }
  }

  // Initialize scores
  players.forEach(player => {
    roundScores[player.name] = 0;
    gameState.scores[player.name] = 0;
    gameState.roundScores[player.name] = 0;
    gameState.hands[player.name] = [];
  });

  // Deal cards to players
  function dealCards() {
    const suits: ("hearts" | "diamonds" | "clubs" | "spades")[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: (number | "J" | "Q" | "K" | "A")[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

    let deck: CardType[] = [];

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
    players.forEach((player, index) => {
      player.hand = deck.slice(index * 13, (index + 1) * 13);

      // Sort the hands for easier play
      player.hand.sort((a, b) => {
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

    // Update reactive reference
    players = [...players];
  }

  // Core card playing logic
  function playCard(player: string, card: CardType) {
    if (gameState.passingPhase || gameState.gameOver) return false;

    // Only allow the current player to play
    const currentPlayer = players[gameState.currentPlayerIndex];
    if (player !== currentPlayer.name) return false;

    // Find the card in the player's hand
    const cardIndex = currentPlayer.hand.findIndex(c =>
            c.suit === card.suit && c.rank === card.rank
    );

    if (cardIndex === -1) return false;

    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);
    gameState.hands[player] = [...currentPlayer.hand]; // Update GameState
    players = [...players]; // Update reactive reference

    // Add card to current trick
    gameState.currentTrick = [...gameState.currentTrick, { player, card }];

    // Move to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;

    // Check if trick is complete
    if (gameState.currentTrick.length === 4) {
      completeTrick();
    }

    return true;
  }

  // Complete a trick
  function completeTrick() {
    setTimeout(() => {
      // Simple trick winner logic - first player wins for now
      gameState.trickWinner = gameState.currentTrick[0].player;

      setTimeout(() => {
        const winner = gameState.trickWinner;
        gameState.currentTrick = [];
        gameState.trickWinner = null;
        gameState.currentPlayerIndex = players.findIndex(p => p.name === winner);

        // Check if round is over (all cards played)
        if (players.every(player => player.hand.length === 0)) {
          endRound();
        }
      }, 2000);
    }, 1000);
  }

  // End current round
  function endRound() {
    // Simple scoring - random points for demo
    players.forEach(player => {
      const roundScore = Math.floor(Math.random() * 10);
      roundScores[player.name] = roundScore;
      gameState.roundScores[player.name] = roundScore;
      player.score += roundScore;
      gameState.scores[player.name] = player.score;
    });

    players = [...players]; // Update reactive reference
    roundScores = { ...roundScores };

    // Check if game should end (someone reached 100 points)
    const maxScore = Math.max(...players.map(p => p.score));
    if (maxScore >= 100) {
      gameState.gameOver = true;
      return;
    }

    // Start next round
    gameState.roundNumber++;
    setTimeout(() => {
      initializeGame();
    }, 3000);
  }

  // initialize the game
  function initializeGame() {
    gameState.gameStarted = true;
    gameState.gameOver = false;
    gameState.currentTrick = [];
    gameState.trickWinner = null;
    gameState.currentPlayerIndex = 0;

    // Reset round scores and passing state
    players.forEach(player => {
      roundScores[player.name] = 0;
    });
    roundScores = { ...roundScores };
    humanReadyToPass = false;
    humanSelectedCards = [];
    aiPassingComplete = false;

    // Deal cards
    dealCards();

    // Set passing direction based on round number
    switch ((gameState.roundNumber - 1) % 4) {
      case 0: passingDirection = 'left'; break;
      case 1: passingDirection = 'right'; break;
      case 2: passingDirection = 'across'; break;
      case 3: passingDirection = 'none'; break;
    }

    gameState.passingPhase = passingDirection !== 'none';
    gameState = { ...gameState }; // Update reactive reference
  }

  // Handle card play events from player components
  function handlePlayCard(event) {
    const { player, card } = event.detail;
    playCard(player, card);
  }

  // Handle human player passing selection
  function handleHumanPassingSelection(event) {
    const { ready, selectedCards } = event.detail;
    humanReadyToPass = ready;
    humanSelectedCards = selectedCards;
  }

  // Handle AI player passing selection
  function handleAIPassingSelection(event) {
    // For now, just mark AI as ready (we'll implement actual passing logic later)
    console.log(`${event.detail.player} selected cards for passing:`, event.detail.cards);
  }

  // Handle pass completion
  function handlePassDone() {
    if (!humanReadyToPass) return;

    // End passing phase
    gameState.passingPhase = false;
    humanReadyToPass = false;
    humanSelectedCards = [];
    aiPassingComplete = false;
    gameState = { ...gameState };
  }

  // Control event handlers
  function handleStartGame() {
    initializeGame();
  }

  // Updated to handle REST API room creation
  async function handleCreateGame(event) {
    const { gameId } = event.detail;

    if (isLoggedIn && authToken) {
      try {
        // Create room via REST API
        const response = await makeAuthenticatedRequest('/api/rooms', {
          method: 'POST',
          body: JSON.stringify({ mode: 'normal' })
        });

        const data = await response.json();

        if (data.success) {
          console.log('Room created via API:', data.data);
          alert(`Room created! Share this code: ${data.data.room_code}\n\nURL: ${window.location.origin}/join/${data.data.room_code}`);
          // Could navigate to waiting room here
        } else {
          console.error('Failed to create room:', data.error);
          alert(`Failed to create room: ${data.error?.message}`);
        }
      } catch (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room. Please try again.');
      }
    } else {
      // Fallback to local game for guests
      console.log(`Creating local game with ID: ${gameId}`);
      alert(`Game created! Share this code with friends: ${gameId}\n\nURL: ${window.location.origin}/game/${gameId}`);
      initializeGame();
    }
  }

  function handleJoinGame(event) {
    const { gameCode } = event.detail;
    console.log(`Joining game with code: ${gameCode}`);
    // TODO: Implement REST API room joining
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

  // Authentication event handlers - Updated to handle full user objects
  function handleLoginSuccess(event) {
    const { user, token } = event.detail;
    currentUser = user;
    authToken = token;
    isLoggedIn = true;
    showLogin = false;

    // Store token for persistence
    localStorage.setItem('hearts_token', token);

    console.log(`Welcome back, ${user.username}!`, user);
  }

  function handleAccountCreated(event) {
    const { user, token } = event.detail;
    currentUser = user;
    authToken = token;
    isLoggedIn = true;
    showLogin = false;

    // Store token for persistence
    localStorage.setItem('hearts_token', token);

    console.log(`Account created for ${user.username}!`, user);
  }

  function handlePlayAsGuest() {
    currentUser = null;
    authToken = null;
    isLoggedIn = false;
    showLogin = false;

    // Clear any stored token
    localStorage.removeItem('hearts_token');
  }

  function handleShowLogin() {
    showLogin = true;
  }

  function handleLogout() {
    currentUser = null;
    authToken = null;
    isLoggedIn = false;
    showLogin = false;

    // Clear stored token
    localStorage.removeItem('hearts_token');
  }

  // Check for existing auth on component mount
  onMount(() => {
    checkExistingAuth();
  });

  // Reactive statements for scores
  $: scores = players.reduce((acc, player) => {
    acc[player.name] = player.score;
    return acc;
  }, {});

  // Pass user info to child components
  $: userForComponents = currentUser ? {
    user_id: currentUser.user_id,
    username: currentUser.username
  } : null;
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
          {#if gameState.currentTrick.length === 0}
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
                          suit={gameState.currentTrick.find(t => t.player === players[2].name).card.suit}
                          rank={gameState.currentTrick.find(t => t.player === players[2].name).card.rank}
                          faceUp={true}
                  />
                </div>
              {/if}

              <!-- West card position -->
              {#if gameState.currentTrick.find(t => t.player === players[1].name)}
                <div class="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-1">
                  <Card
                          suit={gameState.currentTrick.find(t => t.player === players[1].name).card.suit}
                          rank={gameState.currentTrick.find(t => t.player === players[1].name).card.rank}
                          faceUp={true}
                  />
                </div>
              {/if}

              <!-- East card position -->
              {#if gameState.currentTrick.find(t => t.player === players[3].name)}
                <div class="absolute right-0 top-1/2 transform -translate-y-1/2 rotate-1">
                  <Card
                          suit={gameState.currentTrick.find(t => t.player === players[3].name).card.suit}
                          rank={gameState.currentTrick.find(t => t.player === players[3].name).card.rank}
                          faceUp={true}
                  />
                </div>
              {/if}

              <!-- South card position (You) -->
              {#if gameState.currentTrick.find(t => t.player === players[0].name)}
                <div class="absolute bottom-0 left-1/2 transform -translate-x-1/2 -rotate-2">
                  <Card
                          suit={gameState.currentTrick.find(t => t.player === players[0].name).card.suit}
                          rank={gameState.currentTrick.find(t => t.player === players[0].name).card.rank}
                          faceUp={true}
                  />
                </div>
              {/if}
            </div>
          {/if}

          <!-- Trick winner announcement -->
          {#if gameState.trickWinner}
            <div class="absolute -bottom-12 left-1/2 transform -translate-x-1/2
                        bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium
                        animate-pulse">
              {gameState.trickWinner} wins trick
            </div>
          {/if}
        </div>

        <!-- South Player (Human) -->
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <HumanPlayer
                  playerName={players[0].name}
                  cards={players[0].hand}
                  isActive={gameState.currentPlayerIndex === 0}
                  score={players[0].score}
                  passingPhase={gameState.passingPhase}
                  on:playCard={handlePlayCard}
                  on:readyToPassChanged={handleHumanPassingSelection}
          />
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
                    <span>Round {gameState.roundNumber}</span>
                    <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                    {#if gameState.passingPhase}
                      <span class="text-yellow-300">Pass {passingDirection}</span>
                    {:else}
                      <span class="text-white font-medium">{players[gameState.currentPlayerIndex].name}'s Turn</span>
                    {/if}
                  </div>
                </div>

                <!-- Game Status -->
                <div class="text-white text-sm space-y-1 border-t border-white border-opacity-20 pt-2">
                  {#if gameState.passingPhase}
                    <div class="text-yellow-300 font-medium">Passing Phase</div>
                    <div class="text-green-200">Choose 3 cards to pass {passingDirection}</div>
                  {:else if gameState.currentPlayerIndex !== 0}
                    <div class="text-blue-300 font-medium">Waiting...</div>
                    <div class="text-green-200">{players[gameState.currentPlayerIndex].name} is playing</div>
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
                      scores={scores}
                      roundScores={roundScores}
                      roundNumber={gameState.roundNumber}
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
            authToken={authToken}
            isLoggedIn={isLoggedIn}
            on:startGame={handleStartGame}
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