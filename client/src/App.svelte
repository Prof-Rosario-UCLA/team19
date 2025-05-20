<script>
  // Simple counter to test reactivity
  let count = 0;

  function increment() {
    count += 1;
  }

  function decrement() {
    count -= 1;
  }


  // Import components to test
  import Card from './components/cards/Card.svelte';
  import Hand from './components/cards/Hand.svelte';
  import Table from './components/game/Table.svelte';
  import { setContext } from 'svelte';
  
  // Set card dimensions context
  setContext('cardWidth', 80);
  setContext('cardHeight', 120);
  
  // Sample data for testing
  const sampleCards = [
    { suit: "hearts", rank: "A" },
    { suit: "diamonds", rank: 10 },
    { suit: "clubs", rank: "K" },
    { suit: "spades", rank: "Q" }
  ];
  
  const sampleTrick = [
    { player: "North", card: { suit: "clubs", rank: 2 } },
    { player: "East", card: { suit: "clubs", rank: 9 } },
  ];



</script>





<main class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
  <div class="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
    <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">Tailwind Test</h1>

    <div class="flex flex-col items-center gap-6">
      <!-- Card to demonstrate Tailwind styling -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 w-full">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Counter Example</h2>
        <p class="text-gray-600 mb-4">
          This simple counter demonstrates that Svelte reactivity and Tailwind CSS are working together.
        </p>

        <div class="flex items-center justify-center gap-4 mt-4">
          <button
                  class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  on:click={decrement}
          >
            -
          </button>

          <div class="text-2xl font-bold w-16 text-center">{count}</div>

          <button
                  class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  on:click={increment}
          >
            +
          </button>
        </div>
      </div>

      <!-- Card Component Test -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 w-full">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Card Component</h2>
        <div class="flex justify-center gap-4 flex-wrap">
          <Card suit="hearts" rank="A" />
          <Card suit="diamonds" rank="K" />
          <Card suit="clubs" rank="Q" />
          <Card suit="spades" rank="J" />
          <Card suit="hearts" rank={10} />
          <!-- Test a card face down -->
          <Card suit="spades" rank={2} faceUp={false} />
          <!-- Test a selectable card -->
          <Card suit="hearts" rank="Q" selectable={true} />
          <!-- Test a selected card -->
          <Card suit="diamonds" rank={7} selectable={true} selected={true} />
        </div>
      </div>

      <!-- Hand Component Test -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 w-full">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Hand Component</h2>
        <div class="flex justify-center">
          <Hand cards={sampleCards} playable={true} isCurrentPlayer={true} />
        </div>
      </div>

      <!-- Table Component Test -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 w-full">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Table Component</h2>
        <div class="flex justify-center">
          <Table currentTrick={sampleTrick} trickWinner={null} />
        </div>
      </div>
    </div>

    <footer class="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
      Hearts Game Component Tests
    </footer>

  </div>
</main>