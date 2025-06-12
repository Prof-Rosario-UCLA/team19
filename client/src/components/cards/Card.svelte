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

  // Make these REACTIVE with $: to ensure they update when props change
  $: isRed = suit === "hearts" || suit === "diamonds";
  $: suitSymbol = {
    "hearts": "♥",
    "diamonds": "♦",
    "clubs": "♣",
    "spades": "♠"
  }[suit];

  const suitName = {
    "hearts": "Hearts",
    "diamonds": "Diamonds",
    "clubs": "Clubs",
    "spades": "Spades"
  }[suit];

  const rankName = typeof rank === 'number' ? rank.toString() :
      rank === 'J' ? 'Jack' :
      rank === 'Q' ? 'Queen' :
      rank === 'K' ? 'King' :
      rank === 'A' ? 'Ace' : rank.toString();

  // Debug logging to see what each card receives
  $: console.log(`Card component: ${rank} of ${suit} (red: ${isRed}, symbol: ${suitSymbol})`);

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (selectable) {
      dispatch('cardSelect', { suit, rank });
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (selectable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  }

  $: accessibleLabel = faceUp
    ? `${rankName} of ${suitName}${selected ? ', selected' : ''}`
    : 'Face down card';
</script>

<div
    class="relative bg-white border-2 rounded-md shadow-md transition-all duration-200 ease-in-out
     {selectable ? 'cursor-pointer hover:-translate-y-2 focus:ring-4 focus:ring-blue-500' : 'cursor-default'}
     {selected ? '-translate-y-4 shadow-xl ring-4 ring-yellow-400' : ''}
     {isRed && faceUp ? 'border-red-600' : 'border-gray-600'}"
    style="width: {cardWidth}px; height: {cardHeight}px;"
    on:click={handleClick}
    on:keydown={handleKeydown}
    role={selectable ? 'button' : 'img'}
    tabindex={selectable ? 0 : -1}
    aria-label={accessibleLabel}
>
  {#if faceUp}
    <!-- Top left corner -->
    <div class="absolute top-1 left-1 flex flex-col items-center font-bold text-sm leading-none
                {isRed ? 'text-red-700' : 'text-gray-900'}">
      <div class="font-semibold">{rank}</div>
      <div class="text-lg">{suitSymbol}</div>
    </div>

    <!-- Center symbol -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold
                {isRed ? 'text-red-700' : 'text-gray-900'}">
      {suitSymbol}
    </div>

    <!-- Bottom right corner -->
    <div class="absolute bottom-1 right-1 flex flex-col items-center font-bold text-sm leading-none rotate-180
                {isRed ? 'text-red-700' : 'text-gray-900'}">
      <div class="font-semibold">{rank}</div>
      <div class="text-lg">{suitSymbol}</div>
    </div>
  {:else}
    <!-- Card back design -->
    <div class="w-full h-full rounded-md bg-gradient-to-br from-blue-700 to-blue-900 relative">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white rounded-full opacity-50"></div>
    </div>
  {/if}
</div>