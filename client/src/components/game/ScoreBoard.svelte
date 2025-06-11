<script lang="ts">
  export let scores: { [playerName: string]: number } = {};
  export let roundScores: { [playerName: string]: number } = {};
  export let roundNumber: number = 1;

  // Import to check if this is an online game and get self player name
  import { isOnlineGame, selfPlayerName } from '../../lib/stores/socket';

  // Get the current player's name (for highlighting)
  $: myPlayerName = $isOnlineGame ? $selfPlayerName : 'You';

  // Debug logging
  $: console.log('ScoreBoard debug:', {
    scores,
    roundScores,
    myPlayerName,
    isOnlineGame: $isOnlineGame,
    scoreKeys: Object.keys(scores)
  });
</script>

<div class="bg-black bg-opacity-40 rounded-lg p-3">
  <div class="text-white text-xs">
    <div class="font-medium mb-2 text-center">Scores - Round {roundNumber}</div>

    <table class="w-full text-xs">
      <thead>
      <tr class="border-b border-white border-opacity-20">
        <th class="text-left pb-1 text-green-200">Player</th>
        <th class="text-center pb-1 text-green-200">Round</th>
        <th class="text-right pb-1 text-green-200">Total</th>
      </tr>
      </thead>
      <tbody>
      {#if Object.keys(scores).length === 0}
        <tr>
          <td colspan="3" class="py-2 text-center text-gray-400">No scores yet</td>
        </tr>
      {:else}
        {#each Object.keys(scores) as player}
          <tr class="border-b border-white border-opacity-10 last:border-0">
            <td class="py-1 {player === myPlayerName || player === 'You' ? 'text-yellow-300 font-medium' : 'text-white'}">{player}</td>
            <td class="py-1 text-center text-green-200">{roundScores[player] || 0}</td>
            <td class="py-1 text-right text-white font-medium">{scores[player] || 0}</td>
          </tr>
        {/each}
      {/if}
      </tbody>
    </table>
  </div>
</div>