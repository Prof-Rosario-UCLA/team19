import { Request } from 'express';

export interface User {
    user_id: number;
    auth_id: string;
    auth_provider: 'google' | 'apple' | 'internal';
    username: string;
    email: string;
    avatar_url?: string;
    join_date: Date;
    rating: number;
}

export interface Room {
    game_id: number;
    room_code: string;
    host_id: number;
    start_time: Date;
    end_time?: Date;
    status: 'pending' | 'in_progress' | 'completed';
    mode: 'normal';
}

export interface Player {
    player_id: number;
    game_id: number;
    user_id?: number;
    display_name: string;
    score: number;
    placement?: number;
    type: 'registered' | 'guest' | 'bot';
}

export interface AuthRequest extends Request {
    user?: User;
}