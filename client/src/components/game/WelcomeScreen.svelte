<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Leaderboard from '../game/Leaderboard.svelte';
  import WaitingRoom from './WaitingRoom.svelte';

  // Import socket stores
  import {
    socket,
    connectionStatus,
    rooms,
    currentRoomId,
    currentRoomName,
    inWaitingRoom,
    error,
    selfPlayerName,
    connectSocket,
    disconnectSocket,
    createRoom,
    joinRoom,
    getRooms
  } from '../../lib/stores/socket';

  export let currentUser: any = null;
  export let authToken: string | null = null;
  export let isLoggedIn: boolean = false;

  const dispatch = createEventDispatcher();

  let gameCode = '';
  let showJoinInput = false;
  let showCreateInput = false;
  let showGameRules = false;
  let roomName = '';
  let playerName = currentUser?.username || '';
  let isConnecting = false;
  let showRoomsList = false;

  // Local error states (separate from socket store errors)
  let roomError = '';

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

  function startLocalGame() {
    dispatch('startGame');
  }

  function handleConnect() {
    isConnecting = true;
    roomError = '';
    connectSocket();
  }

  function handleDisconnect() {
    disconnectSocket();
  }

  async function createOnlineRoom() {
    if (!roomName.trim()) {
      roomError = 'Please enter a room name';
      return;
    }

    roomError = '';

    if (isLoggedIn && authToken) {
      // Create room via REST API first
      try {
        const response = await makeAuthenticatedRequest('/api/rooms', {
          method: 'POST',
          body: JSON.stringify({ mode: 'normal' })
        });

        const data = await response.json();

        if (data.success) {
          console.log('Room created via REST API:', data.data);
          gameCode = data.data.room_code;

          // Now tell socket to set up the existing room
          if ($socket?.connected) {
            createRoom(roomName.trim(), {
              user_id: currentUser.user_id,
              username: currentUser.username
            }, (response) => {
              if (response.success) {
                console.log('Socket room setup complete for existing room');
                gameCode = response.roomId;
                joinOnlineRoom();
              } else {
                roomError = `Socket setup failed: ${response.error}`;
              }
            });
          } else {
            roomError = 'Socket not connected. Cannot create real-time game.';
          }
        } else {
          roomError = `Failed to create room: ${data.error?.message}`;
        }
      } catch (error) {
        console.error('Error creating room via API:', error);
        roomError = 'Failed to create room. Please try again.';
      }
    } else {
      // Guest user - socket only
      if (!$socket?.connected) {
        roomError = 'Not connected to server';
        return;
      }

      createRoom(roomName.trim(), undefined, (response) => {
        console.log('Room created successfully:', response);
        if (response.success) {
          gameCode = response.roomId;
          // Auto-join the room we just created
          joinOnlineRoom();
        } else {
          roomError = `Failed to create room: ${response.error}`;
        }
      });
    }
  }

  function joinOnlineRoom() {
    if (!$socket?.connected) {
      roomError = 'Not connected to server';
      return;
    }

    if (!gameCode.trim()) {
      roomError = 'Please enter a room code';
      return;
    }

    if (!playerName.trim()) {
      roomError = 'Please enter your player name';
      return;
    }

    roomError = '';
    const roomIdToJoin = gameCode.trim();
    const playerNameToUse = playerName.trim();

    console.log('Joining room:', roomIdToJoin, 'as:', playerNameToUse);

    // Pass user info if logged in
    const user = isLoggedIn && currentUser ? {
      user_id: currentUser.user_id,
      username: currentUser.username
    } : undefined;

    joinRoom(roomIdToJoin, playerNameToUse, user, (response) => {
      console.log('Join room callback response:', response);
      if (response && response.success) {
        console.log(`✅ Joined room ${roomIdToJoin} successfully`);
        // Room name will be set by the store
      } else {
        const errorMsg = response ? response.error : 'No response from server';
        roomError = `Failed to join room: ${errorMsg}`;
        console.error('❌ Failed to join room:', errorMsg);
      }
    });
  }

  function handleGetRooms() {
    if ($socket?.connected) {
      getRooms();
    }
  }

  function directJoinRoom(room: any) {
    if (!playerName.trim()) {
      roomError = 'Please enter your name first';
      return;
    }

    gameCode = room.id;
    joinOnlineRoom();
  }

  function joinRoomFromList(room: any) {
    gameCode = room.id;
    if (!playerName.trim()) {
      playerName = currentUser?.username || `Player${Math.floor(Math.random() * 1000)}`;
    }

    showJoinInput = true;
    showRoomsList = false;

    console.log('Auto-filled room code:', room.id, 'for room:', room.name);
  }

  function toggleCreateInput() {
    showCreateInput = !showCreateInput;
    if (!showCreateInput) {
      roomName = '';
      roomError = '';
    }
  }

  function toggleJoinInput() {
    showJoinInput = !showJoinInput;
    if (!showJoinInput) {
      gameCode = '';
      roomError = '';
    }
  }

  function toggleRoomsList() {
    showRoomsList = !showRoomsList;
    if (showRoomsList && $socket?.connected) {
      handleGetRooms();
    }
  }

  function toggleGameRules() {
    showGameRules = !showGameRules;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (showJoinInput) {
        joinOnlineRoom();
      } else if (showCreateInput) {
        createOnlineRoom();
      }
    }

    // Close game rules popup with Escape key
    if (event.key === 'Escape' && showGameRules) {
      showGameRules = false;
    }
  }

  function logout() {
    handleDisconnect();
    dispatch('logout');
  }

  // Update player name when currentUser changes
  $: if (currentUser?.username && !playerName) {
    playerName = currentUser.username;
  }

  // Update connecting state based on store
  $: isConnecting = $connectionStatus === 'connecting';

  // Update selfPlayerName in store when playerName changes
  $: if (playerName) {
    selfPlayerName.set(playerName);
  }

  // Game rules data
  const gameRules = {
    basic: [
      "Each player gets 13 cards",
      "Pass 3 cards each round",
      "2 of clubs leads first trick",
      "Must follow suit if possible"
    ],
    scoring: [
      "Each heart = 1 point",
      "Queen of spades = 13 points",
      "Game ends at 100 points",
      "Lowest score wins!"
    ]
  };
</script>

<div class="min-h-screen relative overflow-hidden">
  {#if $inWaitingRoom}
    <!-- Waiting Room Component -->
    <WaitingRoom
            {currentUser}
            {authToken}
            {isLoggedIn}
    />
  {:else}
    <!-- Regular Welcome Screen Content -->
    <!-- Leaderboard in top right (desktop) or below main card (mobile) -->
    <div class="absolute top-4 right-4 z-10 hidden min-[800px]:block">
      <Leaderboard {currentUser} {authToken} />
    </div>

    <!-- User info and logout in top left (if logged in) -->
    {#if currentUser}
      <div class="absolute top-4 left-4 z-10">
        <div class="bg-black bg-opacity-40 rounded-lg p-3 text-white">
          <div class="text-sm">
            <div class="text-green-300 font-medium">Welcome back!</div>
            <div class="text-white">{currentUser.username}</div>
            <div class="text-gray-300 text-xs">Rating: {currentUser.rating}</div>
            <button
                    on:click={logout}
                    class="text-xs text-gray-300 hover:text-white transition-colors mt-1"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Connection Status (top center) -->
    <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div class="bg-black bg-opacity-40 rounded-lg p-2 text-white text-sm flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {$connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></div>
        <span>{$connectionStatus.charAt(0).toUpperCase() + $connectionStatus.slice(1)}</span>
        {#if !$socket?.connected && !isConnecting}
          <button
                  on:click={handleConnect}
                  class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
          >
            Connect
          </button>
        {/if}
      </div>
    </div>

    <div class="h-screen flex items-center justify-center p-4 overflow-y-auto">
      <div class="max-w-2xl mx-auto w-full min-[800px]:pr-10">
        <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-6">

          <!-- Header Section -->
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
            <p class="text-gray-600">The Classic Card Game</p>
            {#if currentUser}
              <p class="text-green-600 text-sm mt-1">Logged in as {currentUser.username}</p>
            {/if}
          </div>

          <!-- Error Messages -->
          {#if $error}
            <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {$error}
            </div>
          {/if}

          {#if roomError}
            <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {roomError}
            </div>
          {/if}

          <!-- Game Options Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800 text-center">Game Options:</h3>

            <!-- Player Name Input -->
            <div class="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <label for="globalPlayerName" class="block text-sm font-medium text-gray-700 mb-2">
                Your Name:
              </label>
              <input
                      id="globalPlayerName"
                      type="text"
                      bind:value={playerName}
                      placeholder={currentUser?.username || "Enter your name"}
                      maxlength="20"
                      readonly={isLoggedIn}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent {isLoggedIn ? 'bg-gray-100' : ''}"
              />
              <p class="text-xs text-gray-500 mt-1">
                {isLoggedIn ? 'Using your account username' : 'This name will be used for online games'}
              </p>
            </div>

            <div class="grid gap-3 mb-4">
              <!-- Local Game Button -->
              <button
                      class="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 font-semibold"
                      on:click={startLocalGame}
              >
                🎮 Play Local Game
              </button>

              <!-- Online Game Section -->
              <div class="space-y-3">
                <!-- Create Online Room -->
                <button
                        class="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all transform hover:scale-105 font-semibold"
                        on:click={toggleCreateInput}
                        disabled={!$socket?.connected}
                >
                  🌐 Create Online Room
                  {#if !$socket?.connected}
                    <span class="text-sm font-normal">(Connect first)</span>
                  {/if}
                </button>

                {#if showCreateInput}
                  <div class="bg-gray-50 p-4 rounded-xl border-2 border-green-200 transition-all duration-300">
                    <div class="space-y-3">
                      <div>
                        <label for="roomName" class="block text-sm font-medium text-gray-700 mb-2">
                          Room Name:
                        </label>
                        <input
                                id="roomName"
                                type="text"
                                bind:value={roomName}
                                on:keydown={handleKeydown}
                                placeholder="My Awesome Game"
                                maxlength="50"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <button
                              on:click={createOnlineRoom}
                              disabled={!roomName.trim()}
                              class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Create Room
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Join Online Room -->
                <button
                        class="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all transform hover:scale-105 font-semibold"
                        on:click={toggleJoinInput}
                        disabled={!$socket?.connected}
                >
                  🔗 Join Online Room
                  {#if !$socket?.connected}
                    <span class="text-sm font-normal">(Connect first)</span>
                  {/if}
                </button>

                {#if showJoinInput}
                  <div class="bg-gray-50 p-4 rounded-xl border-2 border-purple-200 transition-all duration-300">
                    <div class="space-y-3">
                      <div>
                        <label for="gameCode" class="block text-sm font-medium text-gray-700 mb-2">
                          Room Code:
                        </label>
                        <input
                                id="gameCode"
                                type="text"
                                bind:value={gameCode}
                                on:keydown={handleKeydown}
                                placeholder="abcd123 (case sensitive)"
                                maxlength="8"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-mono text-lg"
                        />
                      </div>
                      <button
                              on:click={joinOnlineRoom}
                              disabled={!gameCode.trim() || !playerName.trim() || !$socket?.connected}
                              class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Browse Available Rooms -->
                {#if $socket?.connected}
                  <button
                          class="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 font-semibold"
                          on:click={toggleRoomsList}
                  >
                    🏠 Browse Available Rooms ({$rooms.length})
                  </button>

                  {#if showRoomsList}
                    <div class="bg-gray-50 p-4 rounded-xl border-2 border-orange-200 transition-all duration-300">
                      <div class="flex justify-between items-center mb-3">
                        <h4 class="font-medium text-gray-700">Available Rooms:</h4>
                        <button
                                on:click={handleGetRooms}
                                class="text-sm bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded"
                        >
                          Refresh
                        </button>
                      </div>

                      {#if $rooms.length === 0}
                        <p class="text-gray-500 text-center py-4">No rooms available. Create one!</p>
                      {:else}
                        <div class="space-y-2 max-h-40 overflow-y-auto">
                          {#each $rooms as room}
                            <div class="flex justify-between items-center p-3 bg-white rounded-lg border">
                              <div>
                                <div class="font-medium text-gray-800">{room.name}</div>
                                <div class="text-sm text-gray-500">
                                  ID: {room.id} • Players: {room.playerCount}/4
                                </div>
                              </div>
                              <button
                                      on:click={() => joinRoomFromList(room)}
                                      disabled={room.playerCount >= 4}
                                      class="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium mr-1"
                              >
                                {room.playerCount >= 4 ? 'Full' : 'Auto-Fill'}
                              </button>
                              <button
                                      on:click={() => directJoinRoom(room)}
                                      disabled={room.playerCount >= 4 || !playerName.trim()}
                                      class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
                              >
                                {room.playerCount >= 4 ? 'Full' : 'Join Now'}
                              </button>
                            </div>
                          {/each}
                        </div>
                      {/if}

                      {#if !playerName.trim()}
                        <div class="mt-3">
                          <p class="text-sm text-gray-600 text-center">
                            Please enter your name above to join rooms
                          </p>
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>

          <!-- Game Rules Button and Footer Info -->
          <div class="text-center">
            <button
                    on:click={toggleGameRules}
                    class="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              📖 Game Rules
            </button>

            <div class="text-xs text-gray-500">
              <p>Local games work offline • Online games connect you with other players</p>
              {#if !currentUser}
                <p class="mt-1">
                  <button
                          on:click={() => dispatch('showLogin')}
                          class="text-green-600 hover:text-green-700 font-medium"
                  >
                    Create an account or log in
                  </button>
                  to save your stats and compete on the leaderboard!
                </p>
              {/if}
            </div>
          </div>
        </div>

        <!-- Mobile Leaderboard (below main card on smaller screens) -->
        <div class="min-[800px]:hidden max-[419px]:hidden w-full max-w-md mx-auto">
          <Leaderboard {currentUser} {authToken} />
        </div>
      </div>
    </div>

    <!-- Game Rules Modal Popup -->
    {#if showGameRules}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div class="p-6">
            <!-- Modal Header -->
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">📖 Hearts Game Rules</h3>
              <button
                      on:click={toggleGameRules}
                      class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <!-- Rules Content -->
            <div class="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
              <!-- Basic Rules -->
              <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">Basic Rules</h4>
                <div class="space-y-2">
                  {#each gameRules.basic as rule}
                    <div class="flex items-start gap-2">
                      <span class="text-green-600 font-bold">•</span>
                      <span>{rule}</span>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Scoring Rules -->
              <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3">Scoring</h4>
                <div class="space-y-2">
                  {#each gameRules.scoring as rule}
                    <div class="flex items-start gap-2">
                      <span class="text-red-600 font-bold">•</span>
                      <span>{rule}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Additional Rules Section -->
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 class="text-lg font-semibold text-gray-800 mb-3">Special Rules</h4>
              <div class="space-y-2 text-sm text-gray-700">
                <div class="flex items-start gap-2">
                  <span class="text-blue-600 font-bold">•</span>
                  <span>No hearts or Queen of Spades can be played on the first trick</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-blue-600 font-bold">•</span>
                  <span>Hearts cannot be led until hearts have been "broken" (played in a trick)</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-blue-600 font-bold">•</span>
                  <span>"Shooting the moon" - Taking all hearts and Queen of Spades gives other players 26 points</span>
                </div>
              </div>
            </div>

            <!-- Close Button -->
            <div class="mt-6 text-center">
              <button
                      on:click={toggleGameRules}
                      class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>