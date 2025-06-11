<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { Socket } from 'socket.io-client';

  // Import components
  import WelcomeScreen from './game/WelcomeScreen.svelte';
  import GameBoard from './game/GameBoard.svelte';
  import Login from './game/Login.svelte';
  import type { CardType, PlayerType, GameState } from '../lib/types.ts';

  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);

  // User and authentication state
  let currentUser: any = null;
  let authToken: string | null = null;
  let showLogin = false;
  let isLoggedIn = false;

  // Socket state
  let socket: Socket | null = null;
  let currentRoomId: string = '';

  // Game state
  let gameState: GameState = {
    gameStarted: false,
    gameOver: false,
    roundNumber: 1,
    passingDirection: 'left',
    passingPhase: false,
    currentPlayerIndex: 0,
    players: [],
    hands: {},
    scores: {},
    roundScores: {},
    currentTrick: [],
    trickWinner: null,
    heartsBroken: false
  };

  // Player data
  let players: PlayerType[] = [];
  let roundScores: { [playerName: string]: number } = {};
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

  // Initialize LOCAL game
  function initializeLocalGame() {
    // Reset socket connection for local game
    socket = null;
    currentRoomId = '';

    // Set up local players
    players = [
      { name: 'You', hand: [], score: 0, isHuman: true },
      { name: 'Computer 1', hand: [], score: 0, isHuman: false },
      { name: 'Computer 2', hand: [], score: 0, isHuman: false },
      { name: 'Computer 3', hand: [], score: 0, isHuman: false }
    ];

    // Initialize game state for local game
    gameState = {
      gameStarted: true,
      gameOver: false,
      roundNumber: 1,
      passingDirection: 'left',
      passingPhase: true,
      currentPlayerIndex: 0,
      players: players.map(p => p.name),
      hands: {},
      scores: {},
      roundScores: {},
      currentTrick: [],
      trickWinner: null,
      heartsBroken: false
    };

    // Initialize scores
    players.forEach(player => {
      gameState.scores[player.name] = 0;
      gameState.roundScores[player.name] = 0;
      roundScores[player.name] = 0;
    });

    // Deal cards
    dealCards();

    // Set passing direction
    updatePassingDirection();
  }

  // Deal cards to players (LOCAL game only)
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

      // Update game state hands
      gameState.hands[player.name] = [...player.hand];
    });

    // Update reactive reference
    players = [...players];
  }

  // Update passing direction based on round
  function updatePassingDirection() {
    const directions = ['left', 'right', 'across', 'none'];
    gameState.passingDirection = directions[(gameState.roundNumber - 1) % 4];
    gameState.passingPhase = gameState.passingDirection !== 'none';
  }

  // Core card playing logic (LOCAL game only)
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
    gameState.hands[player] = [...currentPlayer.hand];
    players = [...players];

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

  // Complete a trick (LOCAL game only)
  function completeTrick() {
    setTimeout(() => {
      // Simple trick winner logic - highest card of led suit wins
      const ledSuit = gameState.currentTrick[0].card.suit;
      let winner = gameState.currentTrick[0];

      gameState.currentTrick.forEach(play => {
        if (play.card.suit === ledSuit) {
          const currentRank = typeof winner.card.rank === 'number' ? winner.card.rank :
                  winner.card.rank === 'J' ? 11 : winner.card.rank === 'Q' ? 12 :
                          winner.card.rank === 'K' ? 13 : 14;
          const playRank = typeof play.card.rank === 'number' ? play.card.rank :
                  play.card.rank === 'J' ? 11 : play.card.rank === 'Q' ? 12 :
                          play.card.rank === 'K' ? 13 : 14;

          if (playRank > currentRank) {
            winner = play;
          }
        }
      });

      gameState.trickWinner = winner.player;

      setTimeout(() => {
        gameState.currentTrick = [];
        gameState.trickWinner = null;
        gameState.currentPlayerIndex = players.findIndex(p => p.name === winner.player);

        // Check if round is over
        if (players.every(player => player.hand.length === 0)) {
          endRound();
        }
      }, 2000);
    }, 1000);
  }

  // End round (LOCAL game only)
  function endRound() {
    // Calculate scores for the round
    // This is simplified - in real Hearts, you'd count hearts and Queen of Spades
    players.forEach(player => {
      const points = Math.floor(Math.random() * 26); // Random for now
      roundScores[player.name] = points;
      gameState.roundScores[player.name] = points;
      player.score += points;
      gameState.scores[player.name] = player.score;
    });

    players = [...players];

    // Check if game should end
    const maxScore = Math.max(...players.map(p => p.score));
    if (maxScore >= 100) {
      gameState.gameOver = true;
      return;
    }

    // Start next round
    gameState.roundNumber++;
    setTimeout(() => {
      startNewRound();
    }, 3000);
  }

  // Start new round (LOCAL game only)
  function startNewRound() {
    gameState.currentTrick = [];
    gameState.trickWinner = null;
    gameState.currentPlayerIndex = 0;
    gameState.heartsBroken = false;

    // Reset round scores
    players.forEach(player => {
      roundScores[player.name] = 0;
      gameState.roundScores[player.name] = 0;
    });

    // Deal new cards
    dealCards();
    updatePassingDirection();

    // Reset passing state
    humanReadyToPass = false;
    humanSelectedCards = [];
    aiPassingComplete = false;
  }

  // Handle ONLINE game joined
  function handleJoinedOnlineGame(event) {
    const { gameState: serverGameState, roomId, socket: gameSocket } = event.detail;

    // Store socket and room ID
    socket = gameSocket;
    currentRoomId = roomId;

    // Update game state from server
    gameState = { ...serverGameState };

    // Update players from server state
    if (serverGameState.players && serverGameState.hands) {
      players = serverGameState.players.map((playerName, index) => ({
        name: playerName,
        hand: serverGameState.hands[playerName] || [],
        score: serverGameState.scores[playerName] || 0,
        isHuman: true // In online games, treat all as human (server manages AI)
      }));

      // Initialize round scores
      players.forEach(player => {
        roundScores[player.name] = serverGameState.roundScores[player.name] || 0;
      });
    }
  }

  // Event handlers
  function handleStartGame() {
    initializeLocalGame();
  }

  function handlePlayCard(event) {
    const { player, card } = event.detail;

    if (socket?.connected && currentRoomId) {
      // Online game - emit to server
      socket.emit('play_card', {
        roomId: currentRoomId,
        player,
        card
      }, (response) => {
        if (!response.success) {
          console.error('Failed to play card:', response.error);
        }
      });
    } else {
      // Local game - handle locally
      playCard(player, card);
    }
  }

  function handlePassCards() {
    if (!humanReadyToPass) return;

    if (socket?.connected && currentRoomId) {
      // Online game - emit to server
      socket.emit('pass_cards', {
        roomId: currentRoomId,
        cards: humanSelectedCards
      }, (response) => {
        if (!response.success) {
          console.error('Failed to pass cards:', response.error);
        }
      });
    } else {
      // Local game - handle locally
      // TODO: Implement local passing logic
      gameState.passingPhase = false;
      humanReadyToPass = false;
      humanSelectedCards = [];
      gameState = { ...gameState };
    }
  }

  function handleHumanPassingSelection(event) {
    const { ready, selectedCards } = event.detail;
    humanReadyToPass = ready;
    humanSelectedCards = selectedCards;
  }

  function handleAIPassingSelection(event) {
    // Only relevant for local games
    if (!socket?.connected) {
      console.log(`${event.detail.player} selected cards for passing:`, event.detail.cards);
    }
  }

  function handleRestartGame() {
    if (socket?.connected && currentRoomId) {
      // Online game - request new game from server
      socket.emit('restart_game', { roomId: currentRoomId });
    } else {
      // Local game - restart locally
      initializeLocalGame();
    }
  }

  // Authentication handlers
  function handleLoginSuccess(event) {
    const { user, token } = event.detail;
    currentUser = user;
    authToken = token;
    isLoggedIn = true;
    showLogin = false;
    localStorage.setItem('hearts_token', token);
  }

  function handleAccountCreated(event) {
    const { user, token } = event.detail;
    currentUser = user;
    authToken = token;
    isLoggedIn = true;
    showLogin = false;
    localStorage.setItem('hearts_token', token);
  }

  function handlePlayAsGuest() {
    currentUser = null;
    authToken = null;
    isLoggedIn = false;
    showLogin = false;
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
    localStorage.removeItem('hearts_token');
  }

  function handleJoinGame(event) {
    const { gameCode } = event.detail;
    console.log(`Joining game with code: ${gameCode}`);
  }

  function handleCreateGame(event) {
    const { gameId } = event.detail;
    console.log(`Creating game with ID: ${gameId}`);
  }

  // Check existing auth on mount
  async function checkExistingAuth() {
    const token = localStorage.getItem('hearts_token');
    if (token) {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (data.success) {
          currentUser = data.data.user;
          authToken = token;
          isLoggedIn = true;
          console.log('Session restored for:', currentUser.username);
        } else {
          localStorage.removeItem('hearts_token');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        localStorage.removeItem('hearts_token');
      }
    }
  }

  onMount(() => {
    checkExistingAuth();
  });

  // Reactive statement for scores
  $: scores = players.reduce((acc, player) => {
    acc[player.name] = player.score;
    return acc;
  }, {});
</script>

<!-- Main container -->
<div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
  {#if showLogin}
    <Login
            on:loginSuccess={handleLoginSuccess}
            on:accountCreated={handleAccountCreated}
            on:playAsGuest={handlePlayAsGuest}
    />
  {:else if gameState.gameStarted}
    <GameBoard
            {gameState}
            {players}
            {roundScores}
            {humanReadyToPass}
            {humanSelectedCards}
            {aiPassingComplete}
            {socket}
            {currentRoomId}
            on:startGame={handleStartGame}
            on:restartGame={handleRestartGame}
            on:passDone={handlePassCards}
            on:playCard={handlePlayCard}
            on:humanPassingSelection={handleHumanPassingSelection}
            on:aiPassingSelection={handleAIPassingSelection}
    />
  {:else}
    <WelcomeScreen
            {currentUser}
            {authToken}
            {isLoggedIn}
            on:startGame={handleStartGame}
            on:createGame={handleCreateGame}
            on:joinGame={handleJoinGame}
            on:joinedOnlineGame={handleJoinedOnlineGame}
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
</style>