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