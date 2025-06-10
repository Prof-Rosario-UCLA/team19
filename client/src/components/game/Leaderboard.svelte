<script lang="ts">
  import { onMount } from 'svelte';

  export let currentUser: any = null; // Now expects user object
  export let authToken: string | null = null;

  let leaderboardData: any[] = [];
  let loading = true;
  let error = '';
  let totalPlayers = 0;
  let userRank = 0;

  // Helper function to make API calls
  function makeRequest(url: string, options: any = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }

  async function fetchLeaderboard() {
    try {
      loading = true;
      error = '';

      const response = await makeRequest('/api/leaderboard?limit=50');
      const data = await response.json();

      if (data.success) {
        leaderboardData = data.data.players;
        totalPlayers = data.data.total;

        // Find current user's rank
        if (currentUser) {
          const userEntry = leaderboardData.find(p => p.user_id === currentUser.user_id);
          userRank = userEntry ? userEntry.rank : 0;
        }

        console.log('Leaderboard loaded:', {
          players: leaderboardData.length,
          total: totalPlayers,
          userRank
        });
      } else {
        error = data.error?.message || 'Failed to load leaderboard';
        console.error('Leaderboard API error:', data.error);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      error = 'Unable to connect to server';

      // Fallback to sample data for demo
      leaderboardData = [
        { rank: 1, username: 'CardMaster', rating: 1450, games_played: 180, wins: 127, win_percentage: 71 },
        { rank: 2, username: 'HeartBreaker', rating: 1380, games_played: 145, wins: 89, win_percentage: 61 },
        { rank: 3, username: 'SpadeLord', rating: 1320, games_played: 132, wins: 76, win_percentage: 58 },
        { rank: 4, username: 'DiamondAce', rating: 1280, games_played: 118, wins: 65, win_percentage: 55 },
        { rank: 5, username: 'ClubChamp', rating: 1240, games_played: 108, wins: 54, win_percentage: 50 }
      ];
      totalPlayers = 5;
    } finally {
      loading = false;
    }
  }

  function getRankIcon(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  }

  function getRankClass(rank: number): string {
    switch (rank) {
      case 1: return 'text-yellow-600 font-bold';
      case 2: return 'text-gray-600 font-bold';
      case 3: return 'text-orange-600 font-bold';
      default: return 'text-gray-700';
    }
  }

  function isCurrentUser(player: any): boolean {
    return currentUser && player.user_id === currentUser.user_id;
  }

  function refreshLeaderboard() {
    fetchLeaderboard();
  }

  onMount(() => {
    fetchLeaderboard();
  });

  // Refresh when user changes (login/logout)
  $: if (currentUser !== undefined) {
    fetchLeaderboard();
  }
</script>

<div class="bg-black bg-opacity-40 rounded-lg p-4 min-w-[280px]">
  <div class="text-white text-sm">
    <!-- Header -->
    <div class="font-medium mb-3 text-center">
      <div class="text-yellow-300 text-lg flex items-center justify-center gap-2">
        🏆 Leaderboard
        <button
                on:click={refreshLeaderboard}
                class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                disabled={loading}
                title="Refresh leaderboard"
        >
          {loading ? '⟳' : '↻'}
        </button>
      </div>
      <div class="text-green-200 text-xs">Top Hearts Players</div>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="text-center py-8">
        <div class="text-gray-300">Loading leaderboard...</div>
        <div class="mt-2">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      </div>

      <!-- Error State -->
    {:else if error}
      <div class="text-center py-4">
        <div class="text-red-300 text-xs mb-2">{error}</div>
        <button
                on:click={refreshLeaderboard}
                class="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
        >
          Try Again
        </button>
      </div>

      <!-- Leaderboard Data -->
    {:else}
      <!-- Leaderboard Table -->
      <div class="space-y-1 max-h-80 overflow-y-auto">
        {#each leaderboardData.slice(0, 10) as player}
          <div class="flex items-center justify-between py-2 px-2 rounded-md transition-colors
                      {isCurrentUser(player) ? 'bg-green-600 bg-opacity-30 border border-green-400' : 'hover:bg-white hover:bg-opacity-10'}"
          >
            <!-- Rank and Username -->
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="{getRankClass(player.rank)} text-sm min-w-[24px]">
                {getRankIcon(player.rank)}
              </span>
              <div class="min-w-0">
                <div class="truncate {isCurrentUser(player) ? 'text-yellow-300 font-medium' : 'text-white'}"
                     title={player.username}>
                  {player.username}
                  {#if isCurrentUser(player)}
                    <span class="text-xs text-green-300">(You)</span>
                  {/if}
                </div>
                <div class="text-xs text-gray-400">
                  Rating: {player.rating}
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="text-right text-xs space-y-0.5 ml-2">
              <div class="text-green-200 font-medium">{player.wins}W</div>
              <div class="text-gray-300">{Math.round(player.win_percentage)}%</div>
            </div>
          </div>
        {/each}

        {#if leaderboardData.length === 0}
          <div class="text-center py-4 text-gray-400">
            No players yet. Be the first!
          </div>
        {/if}
      </div>

      <!-- Footer Stats -->
      <div class="mt-3 pt-2 border-t border-white border-opacity-20 text-center">
        <div class="text-green-200 text-xs">
          Total Players: {totalPlayers}
        </div>
        {#if currentUser && userRank > 0}
          <div class="text-yellow-300 text-xs mt-1">
            Your Rank: #{userRank}
          </div>
        {:else if currentUser && userRank === 0}
          <div class="text-gray-300 text-xs mt-1">
            Play a game to get ranked!
          </div>
        {/if}
      </div>
    {/if}
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