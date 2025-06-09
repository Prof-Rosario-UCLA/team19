<script lang="ts">
  import { onMount, setContext } from 'svelte';
  
  // Import components
  import WelcomeScreen from './game/WelcomeScreen.svelte';
  import GameBoard from './game/GameBoard.svelte';
  import Login from './game/Login.svelte';
  import type { CardType, PlayerType, GameState } from '../lib/types.ts';

  let currentUser: string | null = null;
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

  function handleStartNextRound() {
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
    <!-- Game Board Component -->
    <GameBoard
      {gameState}
      {players}
      {roundScores}
      {humanReadyToPass}
      {humanSelectedCards}
      {aiPassingComplete}
      {passingDirection}
      on:startGame={handleStartGame}
      on:restartGame={handleRestartGame}
      on:startNextRound={handleStartNextRound}
    />
  {:else}
    <!-- Welcome Screen Component -->
    <WelcomeScreen 
      currentUser={currentUser}
      on:startGame={handleStartGame}
      on:createGame={handleCreateGame}
      on:joinGame={handleJoinGame}
      on:showLogin={handleShowLogin}
      on:logout={handleLogout}
    />
  {/if}
</div>