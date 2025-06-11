<script lang="ts">
  import { onMount, onDestroy, setContext, createEventDispatcher } from 'svelte';
  import type { Socket } from 'socket.io-client';

  // Import components
  import Card from '../cards/Card.svelte';
  import ScoreBoard from './ScoreBoard.svelte';
  import Controls from './Controls.svelte';
  import AIPlayer from '../players/AIPlayer.svelte';
  import HumanPlayer from '../players/HumanPlayer.svelte';
  import type { CardType, PlayerType, GameState } from '../../lib/types.ts';

  // Set card dimensions context
  setContext('cardWidth', 50);
  setContext('cardHeight', 70);

  // Props
  export let gameState: GameState;
  export let players: PlayerType[];
  export let roundScores: { [playerName: string]: number };
  export let humanReadyToPass: boolean;
  export let humanSelectedCards: CardType[];
  export let aiPassingComplete: boolean;
  export let socket: Socket | null = null;
  export let currentRoomId: string = '';

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Determine if this is an online game
  $: isOnlineGame = socket !== null && socket?.connected && currentRoomId !== '';

  // Socket event listeners (for online games)
  onMount(() => {
    if (socket && isOnlineGame) {
      socket.on('game_state_updated', handleGameStateUpdate);
      socket.on('cards_dealt', handleCardsDealt);
      socket.on('card_played', handleCardPlayed);
      socket.on('trick_completed', handleTrickCompleted);
      socket.on('round_ended', handleRoundEnded);
      socket.on('cards_passed', handleCardsPassed);
      socket.on('game_over', handleGameOver);
    }
  });

  onDestroy(() => {
    if (socket) {
      socket.off('game_state_updated');
      socket.off('cards_dealt');
      socket.off('card_played');
      socket.off('trick_completed');
      socket.off('round_ended');
      socket.off('cards_passed');
      socket.off('game_over');
    }
  });

  // Socket event handlers
  function handleGameStateUpdate(data: any) {
    gameState = { ...data.gameState };

    // Update players' hands
    if (data.gameState.hands) {
      players = players.map(player => ({
        ...player,
        hand: data.gameState.hands[player.name] || [],
        score: data.gameState.scores[player.name] || 0
      }));
    }

    // Update round scores
    if (data.gameState.roundScores) {
      roundScores = { ...data.gameState.roundScores };
    }
  }

  function handleCardsDealt(data: any) {
    // Update hands from server
    if (data.hands) {
      players = players.map(player => ({
        ...player,
        hand: data.hands[player.name] || []
      }));
    }
  }

  function handleCardPlayed(data: any) {
    // Server already updated the game state
    // Just ensure UI is in sync
    gameState.currentTrick = [...data.currentTrick];
    gameState.currentPlayerIndex = data.currentPlayerIndex;
  }

  function handleTrickCompleted(data: any) {
    gameState.trickWinner = data.winner;

    setTimeout(() => {
      gameState.trickWinner = null;
      gameState.currentTrick = [];
      gameState.currentPlayerIndex = data.nextPlayerIndex;
      gameState = { ...gameState };
    }, 2000);
  }

  function handleRoundEnded(data: any) {
    // Update scores from server
    if (data.scores) {
      players = players.map(player => ({
        ...player,
        score: data.scores[player.name] || player.score
      }));
    }

    if (data.roundScores) {
      roundScores = { ...data.roundScores };
      gameState.roundScores = { ...data.roundScores };
    }

    gameState.scores = { ...data.scores };

    // Move to next round or end game
    if (data.gameOver) {
      gameState.gameOver = true;
    } else {
      gameState.roundNumber = data.nextRound;
    }
  }

  function handleCardsPassed(data: any) {
    // Update hands after passing
    if (data.hands) {
      players = players.map(player => ({
        ...player,
        hand: data.hands[player.name] || []
      }));
    }

    gameState.passingPhase = false;
    gameState = { ...gameState };
  }

  function handleGameOver(data: any) {
    gameState.gameOver = true;
    // Update final scores
    if (data.finalScores) {
      players = players.map(player => ({
        ...player,
        score: data.finalScores[player.name] || player.score
      }));
    }
  }

  // Local event handlers
  function handlePlayCard(event) {
    dispatch('playCard', event.detail);
  }

  function handleHumanPassingSelection(event) {
    dispatch('humanPassingSelection', event.detail);
  }

  function handleAIPassingSelection(event) {
    dispatch('aiPassingSelection', event.detail);
  }

  function handlePassDone() {
    dispatch('passDone');
  }

  // Computed values
  $: scores = players.reduce((acc, player) => {
    acc[player.name] = player.score;
    return acc;
  }, {});

  $: passingDirection = gameState.passingDirection;
</script>

<!-- Game Board Container -->
<div class="relative h-screen flex flex-col">
  <div class="flex-1 relative overflow-hidden">
    <!-- Table Background -->
    <div class="absolute inset-0 bg-gradient-radial from-green-600 via-green-700 to-green-800">
      <div class="absolute inset-0 opacity-30"
           style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px);"></div>
    </div>

    <!-- Players -->
    <!-- South Player (You - always human) -->
    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <HumanPlayer
              playerName={players[0]?.name || 'You'}
              cards={players[0]?.hand || []}
              isActive={gameState.currentPlayerIndex === 0}
              score={players[0]?.score || 0}
              passingPhase={gameState.passingPhase}
              isOnlineGame={isOnlineGame}
              on:playCard={handlePlayCard}
              on:readyToPassChanged={handleHumanPassingSelection}
      />
    </div>

    <!-- North Player -->
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <AIPlayer
              playerName={players[2]?.name || 'North'}
              cards={players[2]?.hand || []}
              isActive={gameState.currentPlayerIndex === 2}
              score={players[2]?.score || 0}
              position="north"
              passingPhase={gameState.passingPhase}
              isOnlineGame={isOnlineGame}
              isRealPlayer={isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- West Player -->
    <div class="absolute left-8 top-1/2 transform -translate-y-1/2 z-30">
      <AIPlayer
              playerName={players[1]?.name || 'West'}
              cards={players[1]?.hand || []}
              isActive={gameState.currentPlayerIndex === 1}
              score={players[1]?.score || 0}
              position="west"
              passingPhase={gameState.passingPhase}
              isOnlineGame={isOnlineGame}
              isRealPlayer={isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- East Player -->
    <div class="absolute right-8 top-1/2 transform -translate-y-1/2 z-30">
      <AIPlayer
              playerName={players[3]?.name || 'East'}
              cards={players[3]?.hand || []}
              isActive={gameState.currentPlayerIndex === 3}
              score={players[3]?.score || 0}
              position="east"
              passingPhase={gameState.passingPhase}
              isOnlineGame={isOnlineGame}
              isRealPlayer={isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- Center Card Area -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
      {#if gameState.currentTrick.length === 0}
        <div class="text-green-200 text-opacity-60 text-center font-medium">
          <div class="text-lg">♠ ♥ ♦ ♣</div>
          <div class="text-sm mt-1">Cards played will appear here</div>
          {#if isOnlineGame}
            <div class="text-xs mt-1 text-blue-300">Online Game</div>
          {/if}
        </div>
      {:else}
        <div class="relative w-64 h-64">
          {#each gameState.currentTrick as { player, card }, index}
            {@const playerIndex = players.findIndex(p => p.name === player)}
            {@const position = playerIndex === 0 ? 'bottom' :
                    playerIndex === 1 ? 'left' :
                            playerIndex === 2 ? 'top' : 'right'}
            {@const positionStyles = {
              top: 'top-0 left-1/2 transform -translate-x-1/2 rotate-2',
              left: 'left-0 top-1/2 transform -translate-y-1/2 -rotate-1',
              right: 'right-0 top-1/2 transform -translate-y-1/2 rotate-1',
              bottom: 'bottom-0 left-1/2 transform -translate-x-1/2 -rotate-2'
            }}

            <div class="absolute {positionStyles[position]}">
              <Card
                      suit={card.suit}
                      rank={card.rank}
                      faceUp={true}
              />
            </div>
          {/each}
        </div>
      {/if}

      {#if gameState.trickWinner}
        <div class="absolute -bottom-12 left-1/2 transform -translate-x-1/2
                    bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium
                    animate-pulse">
          {gameState.trickWinner} wins trick
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
                  on:startGame={() => dispatch('startGame')}
                  on:restartGame={() => dispatch('restartGame')}
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

        <!-- Game Status -->
        <div class="order-1 lg:order-2 text-center">
          <div class="bg-black bg-opacity-40 rounded-lg p-3">
            <div class="mb-3">
              <h1 class="text-xl font-bold text-white mb-1">♠ Hearts ♥</h1>
              <div class="text-green-200 text-xs flex items-center justify-center gap-2">
                <span>Round {gameState.roundNumber}</span>
                <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                {#if isOnlineGame}
                  <span class="text-blue-300">Online</span>
                  <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                {/if}
                {#if gameState.passingPhase}
                  <span class="text-yellow-300">Pass {passingDirection}</span>
                {:else if players[gameState.currentPlayerIndex]}
                  <span class="text-white font-medium">{players[gameState.currentPlayerIndex].name}'s Turn</span>
                {/if}
              </div>
            </div>

            <div class="text-white text-sm space-y-1 border-t border-white border-opacity-20 pt-2">
              {#if gameState.passingPhase}
                <div class="text-yellow-300 font-medium">Passing Phase</div>
                <div class="text-green-200">Choose 3 cards to pass {passingDirection}</div>
              {:else if gameState.currentPlayerIndex !== 0}
                <div class="text-blue-300 font-medium">Waiting...</div>
                <div class="text-green-200">{players[gameState.currentPlayerIndex]?.name || 'Player'} is playing</div>
              {:else}
                <div class="text-green-300 font-medium">Your Turn</div>
                <div class="text-green-200">Choose a card to play</div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Scoreboard -->
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