<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { io, Socket } from 'socket.io-client';
  import Leaderboard from '../game/Leaderboard.svelte';
  import WaitingRoom from './WaitingRoom.svelte';
  
  export let currentUser: string | null = null;

  const dispatch = createEventDispatcher();
  
  let gameCode = '';
  let showJoinInput = false;
  let showCreateInput = false;
  let roomName = '';
  let playerName = currentUser || '';
  let socket: Socket | null = null;
  let connectionStatus = 'Disconnected';
  let availableRooms: any[] = [];
  let isConnecting = false;
  let showRoomsList = false;
  
  // Waiting room state
  let inWaitingRoom = false;
  let currentRoomId = '';
  let currentRoomName = '';
  
  // Connection and room management
  let connectionError = '';
  let roomError = '';
  
  function startLocalGame() {
    dispatch('startGame');
  }
  
  function connectToServer() {
    if (socket?.connected) return;
    
    isConnecting = true;
    connectionError = '';
    
    socket = io('http://localhost:3000'); // Change this port if your server runs elsewhere
    
    socket.on('connect', () => {
      connectionStatus = 'Connected';
      isConnecting = false;
      console.log('Connected to server');
      // Automatically get rooms when connected
      getRooms();
    });

    socket.on('disconnect', () => {
      connectionStatus = 'Disconnected';
      isConnecting = false;
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      connectionStatus = 'Connection Failed';
      isConnecting = false;
      connectionError = 'Could not connect to server. Make sure the server is running on localhost:3000';
      console.error('Connection error:', error);
    });

    socket.on('rooms_updated', (rooms) => {
      console.log('Rooms updated:', rooms);
      availableRooms = rooms;
    });

    socket.on('game_state_updated', (data) => {
      console.log('Game state updated:', data);
      // Here you could dispatch an event to start the game with the server state
      dispatch('joinedOnlineGame', { 
        gameState: data.gameState,
        roomId: gameCode // or track this differently
      });
    });
  }
  
  function disconnectFromServer() {
    if (socket) {
      socket.disconnect();
      socket = null;
      availableRooms = [];
    }
  }
  
  function createOnlineRoom() {
    if (!socket?.connected) {
      roomError = 'Not connected to server';
      return;
    }
    
    if (!roomName.trim()) {
      roomError = 'Please enter a room name';
      return;
    }
    
    roomError = '';
    
    socket.emit('create_room', { name: roomName.trim() }, (response) => {
      if (response.success) {
        console.log(`Room created successfully. Room ID: ${response.roomId}`);
        // Auto-join the created room
        gameCode = response.roomId;
        currentRoomName = roomName.trim();
        console.log('About to auto-join with gameCode:', gameCode);
        joinOnlineRoom();
      } else {
        roomError = `Failed to create room: ${response.error}`;
        console.error('Failed to create room:', response.error);
      }
    });
  }
  
  function joinOnlineRoom() {
    if (!socket?.connected) {
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
    const roomIdToJoin = gameCode.trim(); // Remove .toUpperCase()
    const playerNameToUse = playerName.trim();
    
    console.log('=== JOIN ROOM DEBUG ===');
    console.log('Attempting to join room:', roomIdToJoin);
    console.log('Player name:', playerNameToUse);
    console.log('Socket ID:', socket.id);
    console.log('Available rooms before join:', availableRooms);
    
    socket.emit('join_room', { 
      roomId: roomIdToJoin, 
      playerName: playerNameToUse 
    }, (response) => {
      console.log('=== JOIN ROOM RESPONSE ===');
      console.log('Full response:', response);
      
      if (response && response.success) {
        console.log(`✅ Joined room ${roomIdToJoin} successfully`);
        // Enter waiting room
        currentRoomId = roomIdToJoin;
        currentRoomName = roomName || `Room ${roomIdToJoin}`;
        inWaitingRoom = true;
      } else {
        const errorMsg = response ? response.error : 'No response from server';
        roomError = `Failed to join room: ${errorMsg}`;
        console.error('❌ Failed to join room:', errorMsg);
        console.error('Response object:', response);
      }
    });
  }
  
  function getRooms() {
    if (!socket?.connected) return;
    
    socket.emit('get_rooms', (rooms) => {
      console.log('Retrieved rooms:', rooms);
      availableRooms = rooms;
    });
  }
  
  function directJoinRoom(room: any) {
    if (!playerName.trim()) {
      roomError = 'Please enter your name first';
      return;
    }
    
    gameCode = room.id;
    currentRoomName = room.name;
    joinOnlineRoom();
  }
  
  // Waiting room event handlers
  function handleLeaveRoom() {
    inWaitingRoom = false;
    currentRoomId = '';
    currentRoomName = '';
    gameCode = '';
  }
  
  function handleGameReady(event) {
    console.log('Game is ready to start:', event.detail);
    // Could show a countdown or loading screen here
  }
  
  function handleGameStarted(event) {
    console.log('Game started:', event.detail);
    dispatch('joinedOnlineGame', { 
      gameState: event.detail.gameState,
      roomId: event.detail.roomId
    });
  }
  
  function joinRoomFromList(room: any) {
    gameCode = room.id;
    currentRoomName = room.name;
    if (!playerName.trim()) {
      playerName = currentUser || `Player${Math.floor(Math.random() * 1000)}`;
    }
    
    // Auto-open join input and pre-fill the room code
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
    if (showRoomsList && socket?.connected) {
      getRooms();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (showJoinInput) {
        joinOnlineRoom();
      } else if (showCreateInput) {
        createOnlineRoom();
      }
    }
  }

  function logout() {
    disconnectFromServer();
    dispatch('logout');
  }
  
  // Auto-connect on mount if user wants to play online
  onMount(() => {
    // You could auto-connect here or wait for user action
  });
  
  onDestroy(() => {
    disconnectFromServer();
  });
  
  // Game rules data for easier modification
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

<div class="min-h-screen relative">
  {#if inWaitingRoom}
    <!-- Waiting Room Component -->
    <WaitingRoom 
      {socket}
      roomId={currentRoomId}
      roomName={currentRoomName}
      {playerName}
      {currentUser}
      on:leaveRoom={handleLeaveRoom}
      on:gameReady={handleGameReady}
      on:gameStarted={handleGameStarted}
    />
  {:else}
    <!-- Regular Welcome Screen Content -->
  <!-- Leaderboard in top right -->
  <div class="absolute top-4 right-4 z-10">
    <Leaderboard currentUser={currentUser} />
  </div>

  <!-- User info and logout in top left (if logged in) -->
  {#if currentUser}
    <div class="absolute top-4 left-4 z-10">
      <div class="bg-black bg-opacity-40 rounded-lg p-3 text-white">
        <div class="text-sm">
          <div class="text-green-300 font-medium">Welcome back!</div>
          <div class="text-white">{currentUser}</div>
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
      <div class="w-2 h-2 rounded-full {connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}"></div>
      <span>{connectionStatus}</span>
      {#if !socket?.connected && !isConnecting}
        <button 
          on:click={connectToServer}
          class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
          Connect
        </button>
      {/if}
    </div>
  </div>

  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">

        <!-- Header Section -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
          <p class="text-gray-600 text-lg">The Classic Card Game</p>
          {#if currentUser}
            <p class="text-green-600 text-sm mt-2">Logged in as {currentUser}</p>
          {/if}
        </div>
        
        <!-- Error Messages -->
        {#if connectionError}
          <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {connectionError}
          </div>
        {/if}
        
        {#if roomError}
          <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {roomError}
          </div>
        {/if}
        
        <!-- Game Options Section -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 text-gray-800 text-center">Game Options:</h3>
          
          <!-- Player Name Input (moved here) -->
          <div class="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label for="globalPlayerName" class="block text-sm font-medium text-gray-700 mb-2">
              Your Name:
            </label>
            <input
              id="globalPlayerName"
              type="text"
              bind:value={playerName}
              placeholder={currentUser || "Enter your name"}
              maxlength="20"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-500 mt-1">This name will be used for online games</p>
          </div>
          
          <div class="grid gap-4 mb-6">
            <!-- Local Game Button -->
            <button 
              class="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
              on:click={startLocalGame}
            >
              🎮 Play Local Game
            </button>
            
            <!-- Online Game Section -->
            <div class="space-y-3">
              <!-- Create Online Room -->
              <button 
                class="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
                on:click={toggleCreateInput}
                disabled={!socket?.connected}
              >
                🌐 Create Online Room
                {#if !socket?.connected}
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
                      disabled={!roomName.trim() || !socket?.connected}
                      class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                      Create Room
                    </button>
                  </div>
                </div>
              {/if}
              
              <!-- Join Online Room -->
              <button 
                class="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
                on:click={toggleJoinInput}
                disabled={!socket?.connected}
              >
                🔗 Join Online Room
                {#if !socket?.connected}
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
                      disabled={!gameCode.trim() || !playerName.trim() || !socket?.connected}
                      class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              {/if}
              
              <!-- Browse Available Rooms -->
              {#if socket?.connected}
                <button 
                  class="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl shadow-lg transition-all transform hover:scale-105 text-lg font-semibold"
                  on:click={toggleRoomsList}
                >
                  🏠 Browse Available Rooms ({availableRooms.length})
                </button>
                
                {#if showRoomsList}
                  <div class="bg-gray-50 p-4 rounded-xl border-2 border-orange-200 transition-all duration-300">
                    <div class="flex justify-between items-center mb-3">
                      <h4 class="font-medium text-gray-700">Available Rooms:</h4>
                      <button
                        on:click={getRooms}
                        class="text-sm bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded"
                      >
                        Refresh
                      </button>
                    </div>
                    
                    {#if availableRooms.length === 0}
                      <p class="text-gray-500 text-center py-4">No rooms available. Create one!</p>
                    {:else}
                      <div class="space-y-2 max-h-40 overflow-y-auto">
                        {#each availableRooms as room}
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
        
        <!-- Rules Section -->
        <div class="mb-8">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Game Rules:</h3>
          <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <!-- Basic Rules -->
            <div class="space-y-2">
              {#each gameRules.basic as rule}
                <div class="flex items-start gap-2">
                  <span class="text-green-600 font-bold">•</span>
                  <span>{rule}</span>
                </div>
              {/each}
            </div>
            
            <!-- Scoring Rules -->
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
        
        <!-- Footer Info -->
        <div class="text-center text-xs text-gray-500">
          <p>Local games work offline • Online games connect you with other players</p>
          {#if !currentUser}
            <p class="mt-1">
              <button 
                on:click={() => dispatch('showLogin')}
                class="text-green-600 hover:text-green-700 font-medium"
              >
                Create an account
              </button> 
              to save your stats and compete on the leaderboard!
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
  {/if}
</div>