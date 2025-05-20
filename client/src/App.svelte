<script lang="ts">
  // Simple counter to test reactivity
  let count = 0;

  function increment() {
    count += 1;
  }

  function decrement() {
    count -= 1;
  }
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

      <!-- Color samples to verify Tailwind is working -->
      <div class="grid grid-cols-4 gap-2 w-full">
        <div class="h-8 bg-blue-500 rounded"></div>
        <div class="h-8 bg-red-500 rounded"></div>
        <div class="h-8 bg-green-500 rounded"></div>
        <div class="h-8 bg-yellow-500 rounded"></div>
      </div>

      <!-- UI elements to test more Tailwind features -->
      <div class="w-full space-y-4">
        <input
                type="text"
                placeholder="Input with Tailwind styles"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Button 1
          </button>
          <button class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
            Button 2
          </button>
        </div>
      </div>
    </div>

    <footer class="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
      Tailwind CSS + Svelte is working!
    </footer>
  </div>
</main>