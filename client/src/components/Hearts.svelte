<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import WelcomeScreen from './game/WelcomeScreen.svelte';
  import GameBoard from './game/GameBoard.svelte';
  import Login from './game/Login.svelte';
  import type { CardType, PlayerType, GameState } from '../lib/types.ts';
  import {
    gameState,
    players,
    inWaitingRoom,
    isOnlineGame,
    disconnectSocket
  } from '../lib/stores/socket';

  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);

  // User and authentication state
  let currentUser: any = null;
  let authToken: string | null = null;
  let showLogin = false;
  let isLoggedIn = false;

  // Local game state (offline games only)
  let localGameState: GameState = {
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

  let localPlayers: PlayerType[] = [];
  let localRoundScores: { [playerName: string]: number } = {};
  let humanReadyToPass = false;
  let humanSelectedCards: CardType[] = [];

  // Make authenticated API calls
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

  // Initialize local game
  function initializeLocalGame() {
    localPlayers = [
      { name: 'You', hand: [], score: 0, isHuman: true },
      { name: 'Computer 1', hand: [], score: 0, isHuman: false },
      { name: 'Computer 2', hand: [], score: 0, isHuman: false },
      { name: 'Computer 3', hand: [], score: 0, isHuman: false }
    ];

    localGameState = {
      gameStarted: true,
      gameOver: false,
      roundNumber: 1,
      passingDirection: 'left',
      passingPhase: true,
      currentPlayerIndex: 0,
      players: localPlayers.map(p => p.name),
      hands: {},
      scores: {},
      roundScores: {},
      currentTrick: [],
      trickWinner: null,
      heartsBroken: false
    };

    // Initialize scores
    localPlayers.forEach(player => {
      localGameState.scores[player.name] = 0;
      localGameState.roundScores[player.name] = 0;
      localRoundScores[player.name] = 0;
    });

    dealCards();
    updatePassingDirection();
  }

  // Deal cards to players (local game only)
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
    localPlayers.forEach((player, index) => {
      player.hand = deck.slice(index * 13, (index + 1) * 13);

      // Sort hands for easier play
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

      localGameState.hands[player.name] = [...player.hand];
    });

    localPlayers = [...localPlayers];
  }

  // Update passing direction based on round
  function updatePassingDirection() {
    const directions = ['left', 'right', 'across', 'none'];
    localGameState.passingDirection = directions[(localGameState.roundNumber - 1) % 4];
    localGameState.passingPhase = localGameState.passingDirection !== 'none';
  }

  // Core card playing logic (local game only)
  function playCard(player: string, card: CardType) {
    if (localGameState.passingPhase || localGameState.gameOver) return false;

    // Only allow the current player to play
    const currentPlayer = localPlayers[localGameState.currentPlayerIndex];
    if (player !== currentPlayer.name) return false;

    // Find the card in the player's hand
    const cardIndex = currentPlayer.hand.findIndex(c =>
            c.suit === card.suit && c.rank === card.rank
    );

    if (cardIndex === -1) return false;

    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);
    localGameState.hands[player] = [...currentPlayer.hand];
    localPlayers = [...localPlayers];

    // Add card to current trick
    localGameState.currentTrick = [...localGameState.currentTrick, { player, card }];

    // Move to next player
    localGameState.currentPlayerIndex = (localGameState.currentPlayerIndex + 1) % 4;

    // Check if trick is complete
    if (localGameState.currentTrick.length === 4) {
      completeTrick();
    }

    return true;
  }

  // Complete a trick (local game only)
  function completeTrick() {
    setTimeout(() => {
      // Determine trick winner - highest card of led suit wins
      const ledSuit = localGameState.currentTrick[0].card.suit;
      let winner = localGameState.currentTrick[0];

      localGameState.currentTrick.forEach(play => {
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

      localGameState.trickWinner = winner.player;

      setTimeout(() => {
        localGameState.currentTrick = [];
        localGameState.trickWinner = null;
        localGameState.currentPlayerIndex = localPlayers.findIndex(p => p.name === winner.player);

        // Check if round is over
        if (localPlayers.every(player => player.hand.length === 0)) {
          endRound();
        }
      }, 2000);
    }, 1000);
  }

  // End round (local game only)
  function endRound() {
    // Calculate round scores (simplified - normally counts hearts and Queen of Spades)
    localPlayers.forEach(player => {
      const points = Math.floor(Math.random() * 26);
      localRoundScores[player.name] = points;
      localGameState.roundScores[player.name] = points;
      player.score += points;
      localGameState.scores[player.name] = player.score;
    });

    localPlayers = [...localPlayers];

    // Check if game should end
    const maxScore = Math.max(...localPlayers.map(p => p.score));
    if (maxScore >= 100) {
      localGameState.gameOver = true;
      return;
    }

    // Start next round
    localGameState.roundNumber++;
    setTimeout(() => {
      startNewRound();
    }, 3000);
  }

  // Start new round (local game only)
  function startNewRound() {
    localGameState.currentTrick = [];
    localGameState.trickWinner = null;
    localGameState.currentPlayerIndex = 0;
    localGameState.heartsBroken = false;

    // Reset round scores
    localPlayers.forEach(player => {
      localRoundScores[player.name] = 0;
      localGameState.roundScores[player.name] = 0;
    });

    dealCards();
    updatePassingDirection();

    // Reset passing state
    humanReadyToPass = false;
    humanSelectedCards = [];
  }

  // Event handlers
  function handleStartGame() {
    initializeLocalGame();
  }

  function handlePlayCard(event) {
    const { player, card } = event.detail;

    if ($isOnlineGame) {
      // Online game handled by socket store
    } else {
      playCard(player, card);
    }
  }

  function handlePassCards() {
    if (!humanReadyToPass) return;

    if ($isOnlineGame) {
      // Online game handled by socket store
    } else {
      localGameState.passingPhase = false;
      humanReadyToPass = false;
      humanSelectedCards = [];
      localGameState = { ...localGameState };
    }
  }

  function handleHumanPassingSelection(event) {
    const { ready, selectedCards } = event.detail;
    humanReadyToPass = ready;
    humanSelectedCards = selectedCards;
  }

  function handleRestartGame() {
    if ($isOnlineGame) {
      // Online game handled by socket store
    } else {
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
    disconnectSocket();
    localStorage.removeItem('hearts_token');
  }

  // Check existing authentication on mount
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
        } else {
          localStorage.removeItem('hearts_token');
        }
      } catch (error) {
        localStorage.removeItem('hearts_token');
      }
    }
  }

  onMount(() => {
    checkExistingAuth();
  });

  // Determine which game state and players to use
  $: currentGameState = $isOnlineGame ? $gameState : localGameState;
  $: currentPlayers = $isOnlineGame ? $players : localPlayers;
  $: currentRoundScores = $isOnlineGame ?
          (currentGameState?.roundScores || {}) :
          localRoundScores;
  $: isGameStarted = currentGameState?.gameStarted || false;
  $: showWaitingRoom = $inWaitingRoom;
</script>

<div class="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
  {#if showLogin}
    <Login
            on:loginSuccess={handleLoginSuccess}
            on:accountCreated={handleAccountCreated}
            on:playAsGuest={handlePlayAsGuest}
    />
  {:else if showWaitingRoom}
    <WelcomeScreen
            {currentUser}
            {authToken}
            {isLoggedIn}
            on:startGame={handleStartGame}
            on:showLogin={handleShowLogin}
            on:logout={handleLogout}
    />
  {:else if isGameStarted}
    <GameBoard
            gameState={currentGameState}
            players={currentPlayers}
            roundScores={currentRoundScores}
            {humanReadyToPass}
            {humanSelectedCards}
            on:startGame={handleStartGame}
            on:restartGame={handleRestartGame}
            on:passDone={handlePassCards}
            on:playCard={handlePlayCard}
            on:humanPassingSelection={handleHumanPassingSelection}
    />
  {:else}
    <WelcomeScreen
            {currentUser}
            {authToken}
            {isLoggedIn}
            on:startGame={handleStartGame}
            on:showLogin={handleShowLogin}
            on:logout={handleLogout}
    />
  {/if}
</div>

<style>
  .bg-gradient-radial {
    background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
  }
</style>