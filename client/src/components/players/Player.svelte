<script lang="ts">
  console.log("Player component loaded");
  import Hand from '../cards/Hand.svelte';
  import type { CardType } from '../../lib/types';
  
  export let name: string;
  export let isCurrentUser: boolean = false; 
  export let cards: CardType[] = [];
  export let score: number = 0;
  export let isCurrentPlayer: boolean = false; //this for whose turn
  export let canPlay: boolean = false;
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  function handlePlayCard(event) {
    dispatch('playCard', { player: name, ...event.detail });
  }
</script>

<div class="flex flex-col items-center p-4 {isCurrentPlayer ? 'bg-yellow-50' : ''} rounded-lg transition-colors duration-300">
  <div class="flex justify-between w-full mb-2">
    <h3 class="font-bold text-lg {isCurrentPlayer ? 'text-yellow-600' : 'text-gray-700'}">{name}</h3>
    <span class="font-medium text-gray-600">Score: {score}</span>
  </div>
  
  <Hand 
    cards={cards} 
    playable={canPlay} 
    isCurrentPlayer={isCurrentPlayer} 
    isCurrentUser={isCurrentUser}
    on:playCard={handlePlayCard} 
  />
</div>