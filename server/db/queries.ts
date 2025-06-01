import { query } from './connection.js';

// ============================
// USER AUTHENTICATION QUERIES
// ============================

export const getUserByAuthId = async (auth_id: string, auth_provider: string) => {
    const result = await query(
        'SELECT user_id, auth_id, auth_provider, username, email, avatar_url, join_date, rating FROM "user" WHERE auth_id = $1 AND auth_provider = $2',
        [auth_id, auth_provider]
    );
    return result.rows[0] || null;
};

export const getUserById = async (user_id: number) => {
    const result = await query(
        'SELECT user_id, username, email, avatar_url, join_date, rating FROM "user" WHERE user_id = $1',
        [user_id]
    );
    return result.rows[0] || null;
};

export const getUserByUsername = async (username: string) => {
    const result = await query(
        'SELECT user_id, username FROM "user" WHERE username = $1',
        [username]
    );
    return result.rows[0] || null;
};

export const getUserByEmail = async (email: string) => {
    const result = await query(
        'SELECT user_id, email FROM "user" WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

export const createUser = async (userData: {
    auth_id: string;
    auth_provider: string;
    username: string;
    email: string;
    avatar_url?: string;
}) => {
    const result = await query(
        `INSERT INTO "user" (auth_id, auth_provider, username, email, avatar_url, rating)
         VALUES ($1, $2, $3, $4, $5, 1000)
             RETURNING user_id, username, email, avatar_url, join_date, rating`,
        [
            userData.auth_id,
            userData.auth_provider,
            userData.username,
            userData.email,
            userData.avatar_url || null
        ]
    );
    return result.rows[0];
};

// ============================
// USER PROFILE QUERIES
// ============================

export const updateUser = async (user_id: number, updates: {
    username?: string;
    avatar_url?: string;
}) => {
    const setParts = [];
    const values = [];
    let paramCount = 1;

    if (updates.username !== undefined) {
        setParts.push(`username = $${paramCount++}`);
        values.push(updates.username);
    }

    if (updates.avatar_url !== undefined) {
        setParts.push(`avatar_url = $${paramCount++}`);
        values.push(updates.avatar_url);
    }

    if (setParts.length === 0) {
        throw new Error('No updates provided');
    }

    values.push(user_id);
    const result = await query(
        `UPDATE "user" SET ${setParts.join(', ')} WHERE user_id = $${paramCount} 
         RETURNING user_id, username, email, avatar_url, join_date, rating`,
        values
    );
    return result.rows[0];
};

// ============================
// USER STATISTICS QUERIES
// ============================

export const getUserStats = async (user_id: number) => {
    const result = await query(
        `SELECT 
           COUNT(*) as games_played,
           AVG(p.score) as avg_score,
           COUNT(CASE WHEN p.placement = 1 THEN 1 END) as wins,
           COUNT(CASE WHEN p.placement = 4 THEN 1 END) as last_place,
           MIN(p.score) as best_score,
           MAX(p.score) as worst_score,
           MIN(r.start_time) as first_game_date,
           AVG(CASE WHEN p.placement = 1 THEN p.score END) as avg_winning_score,
           u.rating as current_rating
         FROM player p
         JOIN room r ON p.game_id = r.game_id
         JOIN "user" u ON u.user_id = p.user_id
         WHERE p.user_id = $1 AND r.status = 'completed'
         GROUP BY u.rating`,
        [user_id]
    );

    const stats = result.rows[0];

    if (!stats || !stats.games_played) {
        const userResult = await query('SELECT rating FROM "user" WHERE user_id = $1', [user_id]);
        return {
            games_played: 0,
            wins: 0,
            win_rate: 0,
            avg_score: 0,
            best_score: 0,
            worst_score: 0,
            last_place_count: 0,
            first_game_date: null,
            avg_winning_score: 0,
            current_rating: userResult.rows[0]?.rating || 1000,
            rating_change_30_days: 0
        };
    }

    return {
        games_played: parseInt(stats.games_played) || 0,
        wins: parseInt(stats.wins) || 0,
        win_rate: stats.games_played > 0 ? (stats.wins / stats.games_played) : 0,
        avg_score: parseFloat(stats.avg_score) || 0,
        best_score: parseInt(stats.best_score) || 0,
        worst_score: parseInt(stats.worst_score) || 0,
        last_place_count: parseInt(stats.last_place) || 0,
        first_game_date: stats.first_game_date,
        avg_winning_score: parseFloat(stats.avg_winning_score) || 0,
        current_rating: parseInt(stats.current_rating) || 1000,
    };
};

export const getUserGameHistory = async (user_id: number, limit: number = 10, offset: number = 0) => {
    const gamesResult = await query(
        `SELECT r.game_id, r.room_code, r.start_time, r.end_time, r.status,
                p.score, p.placement, p.type,
                (SELECT COUNT(*) FROM player WHERE game_id = r.game_id) as total_players,
                (SELECT json_agg(
                    json_build_object(
                        'display_name', p2.display_name,
                        'score', p2.score,
                        'placement', p2.placement,
                        'type', p2.type
                    ) ORDER BY p2.placement
                ) FROM player p2 WHERE p2.game_id = r.game_id AND p2.user_id != p.user_id) as other_players
         FROM room r
         JOIN player p ON r.game_id = p.game_id
         WHERE p.user_id = $1 AND r.status = 'completed'
         ORDER BY r.end_time DESC
         LIMIT $2 OFFSET $3`,
        [user_id, limit, offset]
    );

    const totalResult = await query(
        `SELECT COUNT(*) as total
         FROM room r
         JOIN player p ON r.game_id = p.game_id
         WHERE p.user_id = $1 AND r.status = 'completed'`,
        [user_id]
    );

    return {
        games: gamesResult.rows,
        total: parseInt(totalResult.rows[0].total)
    };
};

// ============================
// ROOM MANAGEMENT QUERIES
// ============================

export const generateUniqueRoomCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code already exists
        const existing = await query('SELECT room_code FROM room WHERE room_code = $1', [code]);
        if (existing.rows.length === 0) {
            return code;
        }

        attempts++;
    }

    throw new Error('Failed to generate unique room code after multiple attempts');
};

export const createRoom = async (room_code: string, host_id: number, mode: string = 'normal') => {
    const result = await query(
        `INSERT INTO room (room_code, host_id, mode)
         VALUES ($1, $2, $3)
         RETURNING game_id, room_code, host_id, start_time, status, mode`,
        [room_code, host_id, mode]
    );
    return result.rows[0];
};

export const getRoomByCode = async (room_code: string) => {
    const result = await query(
        `SELECT r.game_id, r.room_code, r.host_id, r.start_time, r.end_time, r.status, r.mode,
                u.username as host_username, u.avatar_url as host_avatar
         FROM room r
         JOIN "user" u ON r.host_id = u.user_id
         WHERE r.room_code = $1`,
        [room_code]
    );
    return result.rows[0] || null;
};

export const updateRoomStatus = async (game_id: number, status: string) => {
    const result = await query(
        `UPDATE room 
         SET status = $1, 
             start_time = CASE WHEN $1 = 'in_progress' THEN now() ELSE start_time END,
             end_time = CASE WHEN $1 = 'completed' THEN now() ELSE end_time END
         WHERE game_id = $2
         RETURNING *`,
        [status, game_id]
    );
    return result.rows[0];
};

export const deleteRoom = async (game_id: number) => {
    await query('DELETE FROM room WHERE game_id = $1', [game_id]);
};

// ============================
// PLAYER MANAGEMENT QUERIES
// ============================

export const addPlayerToRoom = async (
    game_id: number,
    user_id: number | null,
    display_name: string,
    type: 'registered' | 'guest' | 'bot'
) => {
    const result = await query(
        `INSERT INTO player (game_id, user_id, display_name, score, type)
         VALUES ($1, $2, $3, 0, $4)
         RETURNING player_id, game_id, user_id, display_name, score, type`,
        [game_id, user_id, display_name, type]
    );
    return result.rows[0];
};

export const getPlayersInRoom = async (game_id: number) => {
    const result = await query(
        `SELECT p.player_id, p.user_id, p.display_name, p.score, p.placement, p.type,
                u.username, u.avatar_url, u.rating
         FROM player p
         LEFT JOIN "user" u ON p.user_id = u.user_id
         WHERE p.game_id = $1
         ORDER BY p.player_id`,
        [game_id]
    );
    return result.rows;
};

export const removePlayerFromRoom = async (game_id: number, user_id: number) => {
    const result = await query(
        `DELETE FROM player
         WHERE game_id = $1 AND user_id = $2
         RETURNING *`,
        [game_id, user_id]
    );
    return result.rows[0];
};

export const getPlayerCountInRoom = async (game_id: number) => {
    const result = await query(
        'SELECT COUNT(*) as count FROM player WHERE game_id = $1',
        [game_id]
    );
    return parseInt(result.rows[0].count);
};

export const getPlayerInRoom = async (game_id: number, user_id: number) => {
    const result = await query(
        'SELECT * FROM player WHERE game_id = $1 AND user_id = $2',
        [game_id, user_id]
    );
    return result.rows[0] || null;
};

export const getPlayerNamesInRoom = async (game_id: number): Promise<string[]> => {
    const result = await query(
        'SELECT display_name FROM player WHERE game_id = $1',
        [game_id]
    );
    return result.rows.map(row => row.display_name);
};

export const transferHostToNextPlayer = async (game_id: number, new_host_id: number) => {
    const result = await query(
        'UPDATE room SET host_id = $1 WHERE game_id = $2 RETURNING *',
        [new_host_id, game_id]
    );
    return result.rows[0];
};

export const generateGuestSessionToken = (): string => {
    // TODO: Implement JWT token generation for guests
    return "";
};

// ============================
// GAME STATE MANAGEMENT QUERIES
// ============================

export const startGame = async (game_id: number) => {
    const result = await query(
        `UPDATE room 
         SET status = 'in_progress', start_time = now()
         WHERE game_id = $1 AND status = 'pending'
         RETURNING *`,
        [game_id]
    );
    return result.rows[0];
};

export const endGame = async (game_id: number, finalScores: { player_id: number; score: number }[]) => {
    // First, update all player scores and calculate placements
    for (const playerScore of finalScores) {
        await query(
            'UPDATE player SET score = $1 WHERE player_id = $2',
            [playerScore.score, playerScore.player_id]
        );
    }

    // Calculate placements (lowest score wins in Hearts)
    await query(
        `UPDATE player
         SET placement = subq.placement
         FROM (
             SELECT player_id,
                    ROW_NUMBER() OVER (ORDER BY score ASC) as placement
             FROM player
             WHERE game_id = $1
         ) subq
         WHERE player.player_id = subq.player_id`,
        [game_id]
    );

    // Update room status to completed
    const result = await query(
        `UPDATE room 
         SET status = 'completed', end_time = now()
         WHERE game_id = $1
         RETURNING *`,
        [game_id]
    );

    return result.rows[0];
};

// ============================
// BOT MANAGEMENT QUERIES
// ============================

export const addBotToRoom = async (game_id: number, bot_name: string) => {
    const result = await query(
        `INSERT INTO player (game_id, user_id, display_name, score, type)
         VALUES ($1, NULL, $2, 0, 'bot')
         RETURNING player_id, game_id, display_name, score, type`,
        [game_id, bot_name]
    );
    return result.rows[0];
};

// ============================
// LEADERBOARD QUERIES
// ============================

export const getLeaderboard = async (limit: number = 100, offset: number = 0) => {
    const result = await query(
        `SELECT 
            u.user_id,
            u.username,
            u.rating,
            u.avatar_url,
            u.join_date,
            COUNT(p.player_id) as games_played,
            COUNT(CASE WHEN p.placement = 1 THEN 1 END) as wins,
            CASE 
                WHEN COUNT(p.player_id) > 0 
                THEN ROUND((COUNT(CASE WHEN p.placement = 1 THEN 1 END)::float / COUNT(p.player_id)::float) * 100, 1)
                ELSE 0 
            END as win_percentage
         FROM "user" u
         LEFT JOIN player p ON u.user_id = p.user_id
         LEFT JOIN room r ON p.game_id = r.game_id AND r.status = 'completed'
         WHERE u.username IS NOT NULL
         GROUP BY u.user_id, u.username, u.rating, u.avatar_url, u.join_date
         ORDER BY u.rating DESC, wins DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
};

export const getLeaderboardCount = async () => {
    const result = await query(
        'SELECT COUNT(*) as total FROM "user" WHERE username IS NOT NULL',
        []
    );
    return parseInt(result.rows[0].total);
};