<script lang="ts">
  export let scores: { [playerName: string]: number } = {};
  export let roundScores: { [playerName: string]: number } = {};
  export let roundNumber: number = 1;
</script>

<div class="bg-white shadow-md rounded-lg p-4 my-4">
  <h2 class="text-xl font-bold border-b pb-2 mb-4">Scores - Round {roundNumber}</h2>
  
  <table class="w-full text-left">
    <thead>
      <tr class="border-b">
        <th class="pb-2">Player</th>
        <th class="pb-2">This Round</th>
        <th class="pb-2">Total</th>
      </tr>
    </thead>
    <tbody>
      {#each Object.keys(scores) as player}
        <tr class="border-b last:border-0">
          <td class="py-2">{player}</td>
          <td class="py-2">{roundScores[player] || 0}</td>
          <td class="py-2 font-medium">{scores[player]}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>