<script lang="ts">
  console.log("Card component loaded");

  import { getContext } from "svelte";
  import { createEventDispatcher } from 'svelte';
  
  export let suit: "hearts" | "diamonds" | "clubs" | "spades";
  export let rank: number | "J" | "Q" | "K" | "A";
  export let faceUp: boolean = true;
  export let selectable: boolean = false;
  export let selected: boolean = false;
  
  // Card dimensions from context
  const cardWidth = getContext('cardWidth') || 80;
  const cardHeight = getContext('cardHeight') || 120;
  

  const isRed = suit === "hearts" || suit === "diamonds";
  const suitSymbol = {
    "hearts": "♥",
    "diamonds": "♦",
    "clubs": "♣",
    "spades": "♠"
  }[suit];
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    if (selectable) {
      dispatch('cardSelect', { suit, rank });
    }
  }
</script>

<div 
  class="relative bg-white border border-gray-800 rounded-md shadow-md cursor-default transition-transform duration-200 ease-in-out
         {selectable ? 'cursor-pointer hover:-translate-y-2' : ''} 
         {selected ? '-translate-y-4 shadow-lg' : ''}"
  style="width: {cardWidth}px; height: {cardHeight}px;"
  on:click={handleClick}


  role="button"
  tabindex={selectable ? 0 : -1}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}

>
  {#if faceUp}
    <!-- Top left corner -->
    <div class="absolute top-1 left-1 flex flex-col items-center font-bold {isRed ? 'text-red-600' : 'text-gray-900'}">
      <div>{rank}</div>
      <div>{suitSymbol}</div>
    </div>
    
    <!-- Center symbol -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl {isRed ? 'text-red-600' : 'text-gray-900'}">
      {suitSymbol}
    </div>
    
    <!-- Bottom right corner -->
    <div class="absolute bottom-1 right-1 flex flex-col items-center font-bold rotate-180 {isRed ? 'text-red-600' : 'text-gray-900'}">
      <div>{rank}</div>
      <div>{suitSymbol}</div>
    </div>
  {:else}
    <!-- Card back design -->
    <div class="w-full h-full rounded-md bg-gradient-to-br from-blue-600 to-blue-800 bg-[repeating-linear-gradient(45deg,theme(colors.blue.600),theme(colors.blue.600)_10px,theme(colors.blue.800)_10px,theme(colors.blue.800)_20px)]"></div>
  {/if}
</div>