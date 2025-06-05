<script lang="ts">
  export let currentUser: string | null = null;
  
  // Sample leaderboard data - in a real app this would come from your server
  let leaderboardData = [
    { username: 'CardMaster', totalWins: 127, totalGames: 180, winRate: 71 },
    { username: 'HeartBreaker', totalWins: 89, totalGames: 145, winRate: 61 },
    { username: 'SpadeLord', totalWins: 76, totalGames: 132, winRate: 58 },
    { username: 'DiamondAce', totalWins: 65, totalGames: 118, winRate: 55 },
    { username: 'ClubChamp', totalWins: 54, totalGames: 108, winRate: 50 },
    { username: 'TrickTaker', totalWins: 43, totalGames: 95, winRate: 45 },
    { username: 'PassMaster', totalWins: 38, totalGames: 89, winRate: 43 },
    { username: 'Novice', totalWins: 12, totalGames: 34, winRate: 35 }
  ];
  
  // Add current user to leaderboard if they're not already there
  $: if (currentUser && !leaderboardData.find(p => p.username === currentUser)) {
    leaderboardData = [
      ...leaderboardData,
      { 
        username: currentUser, 
        totalWins: Math.floor(Math.random() * 25), 
        totalGames: Math.floor(Math.random() * 50) + 25,
        winRate: Math.floor(Math.random() * 60) + 20
      }
    ].sort((a, b) => b.totalWins - a.totalWins);
  }
  
  function getRankIcon(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  }
  
  function getRankClass(index: number): string {
    switch (index) {
      case 0: return 'text-yellow-600 font-bold';
      case 1: return 'text-gray-600 font-bold';
      case 2: return 'text-orange-600 font-bold';
      default: return 'text-gray-700';
    }
  }
</script>

<div class="bg-black bg-opacity-40 rounded-lg p-4 min-w-[280px]">
  <div class="text-white text-sm">
    <!-- Header -->
    <div class="font-medium mb-3 text-center">
      <div class="text-yellow-300 text-lg">🏆 Leaderboard</div>
      <div class="text-green-200 text-xs">Top Hearts Players</div>
    </div>
    
    <!-- Leaderboard Table -->
    <div class="space-y-1 max-h-80 overflow-y-auto">
      {#each leaderboardData.slice(0, 10) as player, index}
        <div class="flex items-center justify-between py-2 px-2 rounded-md transition-colors
                    {player.username === currentUser ? 'bg-green-600 bg-opacity-30 border border-green-400' : 'hover:bg-white hover:bg-opacity-10'}"
        >
          <!-- Rank and Username -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span class="{getRankClass(index)} text-sm min-w-[24px]">
              {getRankIcon(index)}
            </span>
            <span class="truncate {player.username === currentUser ? 'text-yellow-300 font-medium' : 'text-white'}"
                  title={player.username}>
              {player.username}
              {#if player.username === currentUser}
                <span class="text-xs text-green-300">(You)</span>
              {/if}
            </span>
          </div>
          
          <!-- Stats -->
          <div class="text-right text-xs space-y-0.5 ml-2">
            <div class="text-green-200 font-medium">{player.totalWins}W</div>
            <div class="text-gray-300">{player.winRate}%</div>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Footer Stats -->
    <div class="mt-3 pt-2 border-t border-white border-opacity-20 text-center">
      <div class="text-green-200 text-xs">
        Total Players: {leaderboardData.length}
      </div>
      {#if currentUser}
        {@const userRank = leaderboardData.findIndex(p => p.username === currentUser) + 1}
        {#if userRank > 0}
          <div class="text-yellow-300 text-xs mt-1">
            Your Rank: #{userRank}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for the leaderboard */
  .overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
</style>