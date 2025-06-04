<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Socket } from 'socket.io-client';
  
  export let socket: Socket | null = null;
  export let roomId: string = '';
  export let roomName: string = '';
  export let playerName: string = '';
  export let currentUser: string | null = null;

  const dispatch = createEventDispatcher();
  
  let playerCount = 1;
  let roomData: any = null;
  let players: Array<{ name: string; index: number; isYou: boolean }> = [];
  let gameStarting = false;
  let connectionError = '';

  // Polling interval for room updates
  let pollInterval: number;

  function updateRoomInfo() {
    if (!socket?.connected || !roomId) return;
    
    socket.emit('get_rooms', (rooms: any[]) => {
      const currentRoom = rooms.find(room => room.id === roomId);
      if (currentRoom) {
        playerCount = currentRoom.playerCount;
        
        // If we have 4 players, the game should start soon
        if (playerCount === 4 && !gameStarting) {
          gameStarting = true;
          setTimeout(() => {
            dispatch('gameReady', { roomId });
          }, 2000); // Give a 2-second countdown
        }
      }
    });
  }

  function leaveRoom() {
    if (socket?.connected) {
      // Disconnect from socket room
      socket.emit('leave_room', { roomId }, (response: any) => {
        console.log('Left room:', response);
      });
    }
    dispatch('leaveRoom');
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomId).then(() => {
      // Could add a toast notification here
      console.log('Room code copied to clipboard');
    }).catch(() => {
      console.log('Failed to copy room code');
    });
  }

  // Listen for real-time updates
  function setupSocketListeners() {
    if (!socket) return;

    socket.on('rooms_updated', (rooms: any[]) => {
      const currentRoom = rooms.find(room => room.id === roomId);
      if (currentRoom) {
        playerCount = currentRoom.playerCount;
        
        // Check if game should start
        if (playerCount === 4 && !gameStarting) {
          gameStarting = true;
          setTimeout(() => {
            dispatch('gameReady', { roomId });
          }, 2000);
        }
      }
    });

    socket.on('game_state_updated', (data: any) => {
      console.log('Game state updated in waiting room:', data);
      // Game has started, transition to game
      dispatch('gameStarted', { 
        gameState: data.gameState,
        roomId 
      });
    });

    socket.on('player_joined', (data: any) => {
      console.log('Player joined:', data);
      updateRoomInfo();
    });

    socket.on('player_left', (data: any) => {
      console.log('Player left:', data);
      updateRoomInfo();
    });
  }

  function cleanup() {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  }

  onMount(() => {
    setupSocketListeners();
    updateRoomInfo();
    
    // Poll for updates every 2 seconds as backup
    pollInterval = setInterval(updateRoomInfo, 2000);
  });

  onDestroy(() => {
    cleanup();
  });

  // Generate placeholder player list
  $: players = Array.from({ length: 4 }, (_, i) => {
    if (i === 0) {
      return { name: playerName, index: 0, isYou: true };
    } else if (i < playerCount) {
      return { name: `Player ${i + 1}`, index: i, isYou: false };
    } else {
      return { name: 'Waiting...', index: i, isYou: false };
    }
  });

  // Progress calculation
  $: progress = (playerCount / 4) * 100;
</script>

<div class="min-h-screen relative">
  <!-- Same header elements as WelcomeScreen -->
  {#if currentUser}
    <div class="absolute top-4 left-4 z-10">
      <div class="bg-black bg-opacity-40 rounded-lg p-3 text-white">
        <div class="text-sm">
          <div class="text-green-300 font-medium">Welcome back!</div>
          <div class="text-white">{currentUser}</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Connection Status -->
  <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
    <div class="bg-black bg-opacity-40 rounded-lg p-2 text-white text-sm flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-green-500"></div>
      <span>Connected</span>
    </div>
  </div>

  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">

        <!-- Header Section -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
          <p class="text-gray-600 text-lg">Waiting for Players</p>
        </div>

        <!-- Room Info Section -->
        <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-8">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800 mb-2">{roomName}</h2>
            <div class="flex items-center justify-center gap-2 mb-3">
              <span class="text-gray-600">Room Code:</span>
              <code class="bg-gray-800 text-green-400 px-3 py-1 rounded font-mono text-lg tracking-wider">{roomId}</code>
              <button 
                on:click={copyRoomCode}
                class="text-blue-600 hover:text-blue-800 text-sm underline"
                title="Copy room code"
              >
                Copy
              </button>
            </div>
            <p class="text-gray-600 text-sm">Share this code with friends to join!</p>
          </div>

          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Players</span>
              <span>{playerCount}/4</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div 
                class="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style="width: {progress}%"
              ></div>
            </div>
          </div>

          <!-- Player List -->
          <div class="grid grid-cols-2 gap-3">
            {#each players as player (player.index)}
              <div class="bg-white rounded-lg p-3 border-2 {player.isYou ? 'border-green-500 bg-green-50' : player.name === 'Waiting...' ? 'border-gray-300 bg-gray-50' : 'border-blue-500 bg-blue-50'}">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full {player.isYou ? 'bg-green-500' : player.name === 'Waiting...' ? 'bg-gray-400' : 'bg-blue-500'}"></div>
                  <span class="font-medium {player.name === 'Waiting...' ? 'text-gray-500 italic' : 'text-gray-800'}">{player.name}</span>
                  {#if player.isYou}
                    <span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full">You</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Game Status -->
        <div class="text-center mb-8">
          {#if gameStarting}
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="text-yellow-800 font-semibold mb-2">🎮 Starting Game...</div>
              <div class="text-yellow-700">All players joined! Game starting in a moment...</div>
            </div>
          {:else if playerCount === 4}
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="text-green-800 font-semibold mb-2">✅ Ready to Start!</div>
              <div class="text-green-700">All players are here. Starting the game...</div>
            </div>
          {:else}
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="text-blue-800 font-semibold mb-2">⏳ Waiting for {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''}</div>
              <div class="text-blue-700">Share the room code with friends to start playing!</div>
            </div>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-4 justify-center">
          <button 
            on:click={leaveRoom}
            class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            Leave Room
          </button>
          
          <button 
            on:click={copyRoomCode}
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Copy Room Code
          </button>
        </div>

        <!-- Footer Info -->
        <div class="text-center text-xs text-gray-500 mt-6">
          <p>The game will start automatically when 4 players join</p>
        </div>
      </div>
    </div>
  </div>
</div>