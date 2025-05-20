<script>
  import { setContext } from 'svelte';
  
  // Import all components to test
  import Card from './components/cards/Card.svelte';
  import Hand from './components/cards/Hand.svelte';
  import Player from './components/players/Player.svelte';
  import Table from './components/game/Table.svelte';
  import ScoreBoard from './components/game/ScoreBoard.svelte';
  import Controls from './components/game/Controls.svelte';
  
  // Set card dimensions context
  setContext('cardWidth', 80);
  setContext('cardHeight', 120);
  
  // Sample data for testing
  const sampleCards = [
    { suit: "hearts", rank: "A" },
    { suit: "diamonds", rank: 10 },
    { suit: "clubs", rank: "K" },
    { suit: "spades", rank: "Q" },
    { suit: "hearts", rank: 7 }
  ];
  
  const sampleTrick = [
    { player: "North", card: { suit: "clubs", rank: 2 } },
    { player: "East", card: { suit: "clubs", rank: 9 } },
    // Uncomment to test more cards in the trick
    // { player: "South", card: { suit: "clubs", rank: "Q" } },
    // { player: "West", card: { suit: "clubs", rank: "K" } }
  ];
  
  const sampleScores = {
    "You": 15,
    "North": 26,
    "East": 0,
    "South": 7
  };
  
  const sampleRoundScores = {
    "You": 0,
    "North": 13,
    "East": 0,
    "South": 0
  };
  
  // State for Controls component
  let gameStarted = true;
  let gameOver = false;
  let passingPhase = false;
  let waitingForPlay = true;
  
  // Toggle function for testing control states
  function toggleGameState() {
    if (!gameStarted) {
      gameStarted = true;
      gameOver = false;
    } else if (!gameOver) {
      gameOver = true;
    } else {
      gameStarted = false;
      gameOver = false;
    }
  }
  
  function togglePassingPhase() {
    passingPhase = !passingPhase;
  }
  
  function toggleWaitingForPlay() {
    waitingForPlay = !waitingForPlay;
  }
  
  // Event handlers for component events
  function handlePlayCard(event) {
    alert(`Card played: ${event.detail.suit} ${event.detail.rank} by ${event.detail.player}`);
  }
  
  function handleControlEvent(event) {
    alert(`Control event: ${event.type}`);
  }
</script>

<main class="min-h-screen bg-gray-100 p-4">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-center mb-8 text-blue-600">Hearts Game Components Test</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Card Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Card Component</h2>
        <div class="flex flex-wrap gap-4 justify-center">
          <div>
            <p class="text-sm text-gray-500 mb-2 text-center">Standard</p>
            <Card suit="hearts" rank="A" />
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2 text-center">Number</p>
            <Card suit="diamonds" rank={10} />
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2 text-center">Face Down</p>
            <Card suit="clubs" rank="K" faceUp={false} />
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2 text-center">Selectable</p>
            <Card suit="spades" rank="Q" selectable={true} />
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2 text-center">Selected</p>
            <Card suit="hearts" rank={7} selectable={true} selected={true} />
          </div>
        </div>
      </div>
      
      <!-- Hand Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Hand Component</h2>
        <div>
          <p class="text-sm text-gray-500 mb-2">Current Player's Hand (playable):</p>
          <div class="bg-gray-100 p-4 rounded-lg">
            <Hand 
              cards={sampleCards} 
              playable={true} 
              isCurrentPlayer={true} 
              on:playCard={handlePlayCard}
            />
          </div>
        </div>
        <div class="mt-6">
          <p class="text-sm text-gray-500 mb-2">Other Player's Hand:</p>
          <div class="bg-gray-100 p-4 rounded-lg">
            <Hand 
              cards={sampleCards.slice(0, 3)} 
              playable={false} 
              isCurrentPlayer={false}
            />
          </div>
        </div>
      </div>
      
      <!-- Player Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Player Component</h2>
        <div class="space-y-6">
          <div>
            <p class="text-sm text-gray-500 mb-2">Human Player (Current Turn):</p>
            <div class="bg-gray-100 p-4 rounded-lg">
              <Player 
                name="You" 
                isHuman={true} 
                cards={sampleCards} 
                score={15}
                isCurrentPlayer={true}
                canPlay={true}
                on:playCard={handlePlayCard}
              />
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2">Computer Player:</p>
            <div class="bg-gray-100 p-4 rounded-lg">
              <Player 
                name="North" 
                isHuman={false} 
                cards={sampleCards.slice(0, 4)} 
                score={26}
                isCurrentPlayer={false}
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Table Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Table Component</h2>
        <div class="bg-gray-100 p-4 rounded-lg">
          <Table 
            currentTrick={sampleTrick} 
            trickWinner={sampleTrick.length === 4 ? "North" : null} 
          />
        </div>
        <div class="mt-4 flex justify-center gap-4">
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            on:click={() => sampleTrick.pop()}
          >
            Remove Card
          </button>
          <button 
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            on:click={() => {
              if (sampleTrick.length < 4) {
                const suits = ["hearts", "diamonds", "clubs", "spades"];
                const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
                const players = ["North", "East", "South", "West"];
                sampleTrick.push({
                  player: players[sampleTrick.length],
                  card: {
                    suit: suits[Math.floor(Math.random() * suits.length)],
                    rank: ranks[Math.floor(Math.random() * ranks.length)]
                  }
                });
              }
            }}
          >
            Add Card
          </button>
        </div>
      </div>
      
      <!-- ScoreBoard Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">ScoreBoard Component</h2>
        <div class="bg-gray-100 p-4 rounded-lg">
          <ScoreBoard 
            scores={sampleScores} 
            roundScores={sampleRoundScores} 
            roundNumber={3}
          />
        </div>
      </div>
      
      <!-- Controls Component Test Section -->
      <div class="bg-white shadow-lg rounded-lg p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Controls Component</h2>
        <div class="bg-gray-100 p-4 rounded-lg mb-4">
          <Controls 
            gameStarted={gameStarted} 
            gameOver={gameOver}
            passingPhase={passingPhase}
            waitingForPlay={waitingForPlay}
            on:startGame={handleControlEvent}
            on:restartGame={handleControlEvent}
            on:passDone={handleControlEvent}
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <button 
            class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
            on:click={toggleGameState}
          >
            Toggle Game State
          </button>
          <button 
            class="px-3 py-1 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600"
            on:click={togglePassingPhase}
          >
            Toggle Passing Phase
          </button>
          <button 
            class="px-3 py-1 bg-amber-500 text-white text-sm rounded-md hover:bg-amber-600"
            on:click={toggleWaitingForPlay}
          >
            Toggle Waiting
          </button>
        </div>
        <div class="mt-2 text-sm text-gray-600">
          Current State: 
          {#if !gameStarted}
            Not Started
          {:else if gameOver}
            Game Over
          {:else if passingPhase}
            Passing Phase
          {:else if waitingForPlay}
            Waiting for Play
          {:else}
            Ready for Play
          {/if}
        </div>
      </div>
    </div>
    
    <div class="mt-8 bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Full Game Preview</h2>
      <div class="grid grid-cols-1 gap-4">
        <!-- North player -->
        <div class="order-1">
          <Player 
            name="North" 
            isHuman={false} 
            cards={sampleCards.slice(0, 4)} 
            score={26}
            isCurrentPlayer={false}
          />
        </div>
        
        <!-- Middle row with Table -->
        <div class="order-2 flex justify-center">
          <div class="w-full max-w-lg">
            <Table currentTrick={sampleTrick} trickWinner={null} />
          </div>
        </div>
        
        <!-- Player's hand -->
        <div class="order-3">
          <Player 
            name="You" 
            isHuman={true} 
            cards={sampleCards} 
            score={15}
            isCurrentPlayer={true}
            canPlay={true}
            on:playCard={handlePlayCard}
          />
        </div>
        
        <!-- Controls -->
        <div class="order-4 flex justify-center">
          <div class="w-full max-w-lg">
            <Controls 
              gameStarted={gameStarted} 
              gameOver={gameOver}
              passingPhase={passingPhase}
              waitingForPlay={waitingForPlay}
            />
          </div>
        </div>
      </div>
    </div>
    
    <footer class="mt-8 text-center text-gray-500 text-sm">
      Hearts Game Components - Test Page
    </footer>
  </div>
</main>