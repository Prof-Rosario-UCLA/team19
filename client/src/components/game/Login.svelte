<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let username = '';
  let password = '';
  let email = '';
  let isCreatingAccount = false;
  let confirmPassword = '';
  let loading = false;
  let error = '';

  function toggleMode() {
    isCreatingAccount = !isCreatingAccount;
    password = '';
    confirmPassword = '';
    email = '';
    error = '';
  }

  async function handleSubmit() {
    error = '';

    // Basic validation
    if (!username.trim() || !password.trim()) {
      error = 'Please fill in all fields';
      return;
    }

    if (username.trim().length < 3) {
      error = 'Username must be at least 3 characters';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    if (isCreatingAccount) {
      if (!email.trim()) {
        error = 'Email is required for account creation';
        return;
      }

      if (password !== confirmPassword) {
        error = 'Passwords do not match';
        return;
      }
    }

    loading = true;

    try {
      if (isCreatingAccount) {
        // Register new account
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password
          })
        });

        const data = await response.json();

        if (data.success) {
          // Store the JWT token
          localStorage.setItem('hearts_token', data.data.token);

          dispatch('accountCreated', {
            user: data.data.user,
            message: 'Account created successfully!'
          });
        } else {
          error = data.error?.message || 'Failed to create account';
        }
      } else {
        // Login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username.trim(),
            password
          })
        });

        const data = await response.json();

        if (data.success) {
          // Store the JWT token
          localStorage.setItem('hearts_token', data.data.token);

          dispatch('loginSuccess', {
            user: data.data.user,
            token: data.data.token
          });
        } else {
          error = data.error?.message || 'Login failed';
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      error = 'Something went wrong. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  function playAsGuest() {
    dispatch('playAsGuest');
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md mx-auto">
    <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">♠ Hearts ♥</h1>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">
          {isCreatingAccount ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p class="text-gray-600 text-sm">
          {isCreatingAccount ? 'Join the Hearts community' : 'Sign in to your account'}
        </p>
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      {/if}

      <!-- Login/Signup Form -->
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <!-- Username Field -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
                  id="username"
                  type="text"
                  bind:value={username}
                  on:keydown={handleKeydown}
                  placeholder="Enter your username"
                  maxlength="20"
                  disabled={loading}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
          />
        </div>

        <!-- Email Field (only for account creation) -->
        {#if isCreatingAccount}
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
                    id="email"
                    type="email"
                    bind:value={email}
                    on:keydown={handleKeydown}
                    placeholder="Enter your email"
                    disabled={loading}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
            />
          </div>
        {/if}

        <!-- Password Field -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
                  id="password"
                  type="password"
                  bind:value={password}
                  on:keydown={handleKeydown}
                  placeholder="Enter your password"
                  disabled={loading}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
          />
        </div>

        <!-- Confirm Password Field (only for account creation) -->
        {#if isCreatingAccount}
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
                    id="confirmPassword"
                    type="password"
                    bind:value={confirmPassword}
                    on:keydown={handleKeydown}
                    placeholder="Confirm your password"
                    disabled={loading}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 transition-colors"
            />
          </div>
        {/if}

        <!-- Submit Button -->
        <button
                type="submit"
                disabled={loading}
                class="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100 text-lg font-semibold disabled:cursor-not-allowed"
        >
          {#if loading}
            <span class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isCreatingAccount ? 'Creating Account...' : 'Signing In...'}
            </span>
          {:else}
            {isCreatingAccount ? '🎮 Create Account' : '🔓 Sign In'}
          {/if}
        </button>
      </form>

      <!-- Toggle Between Login/Signup -->
      <div class="mt-6 text-center">
        <button
                on:click={toggleMode}
                disabled={loading}
                class="text-green-600 hover:text-green-700 font-medium transition-colors disabled:text-gray-400"
        >
          {isCreatingAccount
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
        </button>
      </div>

      <!-- Guest Play Option -->
      <div class="mt-4 text-center">
        <button
                on:click={playAsGuest}
                disabled={loading}
                class="text-gray-500 hover:text-gray-700 text-sm transition-colors disabled:text-gray-400"
        >
          Continue as Guest
        </button>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-xs text-gray-500">
        <p>Your account saves your stats and achievements</p>
      </div>
    </div>
  </div>
</div>