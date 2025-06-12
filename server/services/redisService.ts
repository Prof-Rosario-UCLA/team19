import { createClient } from 'redis';
import { GameState } from '../../types/types.js';

class RedisService {
    private client;
    private static instance: RedisService;

    private constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (err) => console.error('Redis Client Error:', err));
        this.client.on('connect', () => console.log('Redis Client Connected'));
        this.client.connect();
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    // Cache game state for a specific room
    public async cacheGameState(roomId: string, gameState: GameState): Promise<void> {
        try {
            const key = `game:${roomId}`;
            await this.client.set(key, JSON.stringify(gameState));
            console.log(`[Redis] Cached game state for room ${roomId}`);
            console.log(`[Redis] Game state:`, JSON.stringify(gameState, null, 2));
        } catch (error) {
            console.error('[Redis] Error caching game state:', error);
        }
    }

    // Get cached game state for a specific room
    public async getGameState(roomId: string): Promise<GameState | null> {
        try {
            const key = `game:${roomId}`;
            const data = await this.client.get(key);
            if (data) {
                console.log(`[Redis] Retrieved game state for room ${roomId}`);
                console.log(`[Redis] Game state:`, JSON.stringify(JSON.parse(data), null, 2));
            } else {
                console.log(`[Redis] No cached game state found for room ${roomId}`);
            }
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[Redis] Error getting cached game state:', error);
            return null;
        }
    }

    // Delete cached game state for a specific room
    public async deleteGameState(roomId: string): Promise<void> {
        try {
            const key = `game:${roomId}`;
            await this.client.del(key);
            console.log(`[Redis] Deleted game state for room ${roomId}`);
        } catch (error) {
            console.error('[Redis] Error deleting cached game state:', error);
        }
    }

    // Debug method to list all game states
    public async listAllGameStates(): Promise<void> {
        try {
            const keys = await this.client.keys('game:*');
            console.log('[Redis] All game states:');
            for (const key of keys) {
                const data = await this.client.get(key);
                if (data) {
                    console.log(`[Redis] ${key}:`, JSON.stringify(JSON.parse(data), null, 2));
                }
            }
        } catch (error) {
            console.error('[Redis] Error listing game states:', error);
        }
    }
}

export const redisService = RedisService.getInstance(); 