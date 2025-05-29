<script lang="ts">
  export let scores: { [playerName: string]: number } = {};
  export let roundScores: { [playerName: string]: number } = {};
  export let roundNumber: number = 1;
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
        {#each Object.keys(scores) as player}
          <tr class="border-b border-white border-opacity-10 last:border-0">
            <td class="py-1 {player === 'You' ? 'text-yellow-300 font-medium' : 'text-white'}">{player}</td>
            <td class="py-1 text-center text-green-200">{roundScores[player] || 0}</td>
            <td class="py-1 text-right text-white font-medium">{scores[player] || 0}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>