<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Card from '../cards/Card.svelte';
  import ScoreBoard from './ScoreBoard.svelte';
  import Controls from './Controls.svelte';
  import AIPlayer from '../players/AIPlayer.svelte';
  import HumanPlayer from '../players/HumanPlayer.svelte';
  import type { CardType, PlayerType, GameState } from '../../lib/types.ts';
  import {
    socket,
    gameState as storeGameState,
    players as storePlayers,
    isOnlineGame,
    playCard as socketPlayCard,
    passCards as socketPassCards,
    restartGame as socketRestartGame
  } from '../../lib/stores/socket';

  // Props (for local games or fallback)
  export let gameState: GameState | null = null;
  export let players: PlayerType[] = [];
  export let roundScores: { [playerName: string]: number } = {};
  export let humanReadyToPass: boolean = false;
  export let humanSelectedCards: CardType[] = [];

  const dispatch = createEventDispatcher();

  // Use store data for online games, props for local games
  $: currentGameState = $isOnlineGame ? $storeGameState : gameState;
  $: currentPlayers = $isOnlineGame ? $storePlayers : players;
  $: currentRoundScores = $isOnlineGame ?
          (currentGameState?.roundScores || {}) :
          roundScores;

  // Event handlers
  function handlePlayCard(event) {
    const { player, card } = event.detail;

    if ($isOnlineGame) {
      socketPlayCard(card, (response) => {
        if (!response.success) {
          console.error('Failed to play card:', response.error);
        }
      });
    } else {
      dispatch('playCard', event.detail);
    }
  }

  function handleHumanPassingSelection(event) {
    dispatch('humanPassingSelection', event.detail);
  }

  function handleAIPassingSelection(event) {
    if (!$isOnlineGame) {
      dispatch('aiPassingSelection', event.detail);
    }
  }

  function handlePassDone() {
    if ($isOnlineGame) {
      socketPassCards(humanSelectedCards, (response) => {
        if (!response.success) {
          console.error('Failed to pass cards:', response.error);
        }
      });
    } else {
      dispatch('passDone');
    }
  }

  function handleRestartGame() {
    if ($isOnlineGame) {
      socketRestartGame((response) => {
        if (!response.success) {
          console.error('Failed to restart game:', response.error);
        }
      });
    } else {
      dispatch('restartGame');
    }
  }

  // Computed values
  $: scores = currentPlayers.reduce((acc, player) => {
    acc[player.name] = player.score || 0;
    return acc;
  }, {});

  $: passingDirection = currentGameState?.passingDirection || 'left';
  $: isGameStarted = currentGameState?.gameStarted || false;
  $: isGameOver = currentGameState?.gameOver || false;
  $: isPassingPhase = currentGameState?.passingPhase || false;
  $: currentPlayerIndex = $isOnlineGame ?
          (currentGameState?.rotatedCurrentPlayerIndex ?? 0) :
          (currentGameState?.currentPlayerIndex ?? 0);
  $: currentTrick = currentGameState?.currentTrick || [];
  $: trickWinner = currentGameState?.trickWinner;
  $: roundNumber = currentGameState?.roundNumber || 1;

  // Ensure we have 4 players for display with proper card counts
  $: displayPlayers = Array.from({ length: 4 }, (_, i) => {
    if (currentPlayers[i]) {
      const player = currentPlayers[i];
      return {
        ...player,
        hand: $isOnlineGame && i !== 0 ?
                Array.from({ length: getPlayerCardCount(i) }, () => ({ suit: 'spades', rank: 2 })) :
                player.hand
      };
    }
    return {
      name: `Player ${i + 1}`,
      hand: [],
      score: 0,
      isHuman: false
    };
  });

  // Get card count for a player from game state
  function getPlayerCardCount(playerIndex: number): number {
    if (!$isOnlineGame || !currentGameState) return 0;

    const serverPlayers = currentGameState.players;
    if (serverPlayers && serverPlayers[playerIndex]) {
      return serverPlayers[playerIndex].cardCount || 13;
    }

    // Fallback: estimate based on tricks played
    const tricksPlayed = currentGameState.tricksPlayed || 0;
    return 13 - tricksPlayed;
  }
</script>

<div class="relative h-screen flex flex-col">
  <div class="flex-1 relative overflow-hidden">
    <!-- Table Background -->
    <div class="absolute inset-0 bg-gradient-radial from-green-600 via-green-700 to-green-800">
      <div class="absolute inset-0 opacity-30"
           style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px);"></div>
    </div>

    <!-- Players -->
    <!-- South Player (You - always human in display) -->
    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <HumanPlayer
              playerName={displayPlayers[0]?.name || 'You'}
              cards={displayPlayers[0]?.hand || []}
              isActive={currentPlayerIndex === 0}
              score={displayPlayers[0]?.score || 0}
              passingPhase={isPassingPhase}
              isOnlineGame={$isOnlineGame}
              on:playCard={handlePlayCard}
              on:readyToPassChanged={handleHumanPassingSelection}
      />
    </div>

    <!-- North Player -->
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <AIPlayer
              playerName={displayPlayers[2]?.name || 'North'}
              cards={displayPlayers[2]?.hand || []}
              isActive={currentPlayerIndex === 2}
              score={displayPlayers[2]?.score || 0}
              position="north"
              passingPhase={isPassingPhase}
              isOnlineGame={$isOnlineGame}
              isRealPlayer={$isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- West Player -->
    <div class="absolute left-8 top-1/2 transform -translate-y-1/2 z-30 max-h-screen" style="top: clamp(80px, 35%, calc(100vh - 120px));">
      <AIPlayer
              playerName={displayPlayers[1]?.name || 'West'}
              cards={displayPlayers[1]?.hand || []}
              isActive={currentPlayerIndex === 1}
              score={displayPlayers[1]?.score || 0}
              position="west"
              passingPhase={isPassingPhase}
              isOnlineGame={$isOnlineGame}
              isRealPlayer={$isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- East Player -->
    <div class="absolute right-8 top-1/2 transform -translate-y-1/2 z-30 max-h-screen" style="top: clamp(80px, 35%, calc(100vh - 120px));">
      <AIPlayer
              playerName={displayPlayers[3]?.name || 'East'}
              cards={displayPlayers[3]?.hand || []}
              isActive={currentPlayerIndex === 3}
              score={displayPlayers[3]?.score || 0}
              position="east"
              passingPhase={isPassingPhase}
              isOnlineGame={$isOnlineGame}
              isRealPlayer={$isOnlineGame}
              on:playCard={handlePlayCard}
              on:cardsSelectedForPassing={handleAIPassingSelection}
      />
    </div>

    <!-- Center Card Area -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
      {#if currentTrick.length === 0}
        <div class="text-green-200 text-opacity-60 text-center font-medium">
          <div class="text-lg">♠ ♥ ♦ ♣</div>
          <div class="text-sm mt-1">Cards played will appear here</div>
          {#if $isOnlineGame}
            <div class="text-xs mt-1 text-blue-300">Online Game</div>
          {/if}
        </div>
      {:else}
        <div class="relative w-64 h-64">
          {#each currentTrick as trickCard, index}
            {@const playerIndex = Array.isArray(trickCard) ?
                    displayPlayers.findIndex(p => p.name === trickCard.player) :
                    index}
            {@const card = Array.isArray(trickCard) ? trickCard.card : trickCard}
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
                      suit={card.suit ? card.suit.toLowerCase() : 'spades'}
                      rank={card.rank || '2'}
                      faceUp={true}
              />
            </div>
          {/each}
        </div>
      {/if}

      {#if trickWinner}
        <div class="absolute -bottom-12 left-1/2 transform -translate-x-1/2
                    bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium
                    animate-pulse">
          {trickWinner} wins trick
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
                  gameStarted={isGameStarted}
                  gameOver={isGameOver}
                  passingPhase={isPassingPhase}
                  waitingForPlay={currentPlayerIndex !== 0 && !isPassingPhase}
                  on:startGame={() => dispatch('startGame')}
                  on:restartGame={handleRestartGame}
                  on:passDone={handlePassDone}
          />

          {#if isPassingPhase}
            <div class="mt-2 text-center max-[1023px]:hidden">
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
        <div class="order-1 lg:order-2 text-center max-[1023px]:hidden">
          <div class="bg-black bg-opacity-40 rounded-lg p-3">
            <div class="mb-3">
              <h1 class="text-xl font-bold text-white mb-1">♠ Hearts ♥</h1>
              <div class="text-green-200 text-xs flex items-center justify-center gap-2">
                <span>Round {roundNumber}</span>
                <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                {#if $isOnlineGame}
                  <span class="text-blue-300">Online</span>
                  <span class="w-1 h-1 bg-green-400 rounded-full"></span>
                {/if}
                {#if isPassingPhase}
                  <span class="text-yellow-300">Pass {passingDirection}</span>
                {:else if displayPlayers[currentPlayerIndex]}
                  <span class="text-white font-medium">{displayPlayers[currentPlayerIndex].name}'s Turn</span>
                {/if}
              </div>
            </div>

            <div class="text-white text-sm space-y-1 border-t border-white border-opacity-20 pt-2">
              {#if isPassingPhase}
                <div class="text-yellow-300 font-medium">Passing Phase</div>
                <div class="text-green-200">Choose 3 cards to pass {passingDirection}</div>
              {:else if currentPlayerIndex !== 0}
                <div class="text-blue-300 font-medium">Waiting...</div>
                <div class="text-green-200">{displayPlayers[currentPlayerIndex]?.name || 'Player'} is playing</div>
              {:else}
                <div class="text-green-300 font-medium">Your Turn</div>
                <div class="text-green-200">Choose a card to play</div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Scoreboard -->
        <div class="order-3 max-[1023px]:hidden">
          <ScoreBoard
                  {scores}
                  roundScores={currentRoundScores}
                  {roundNumber}
          />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .bg-gradient-radial {
    background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
  }

  @media (max-width: 1024px) {
    .absolute.left-8,
    .absolute.right-8 {
      top: 20%;
    }
  }
</style>