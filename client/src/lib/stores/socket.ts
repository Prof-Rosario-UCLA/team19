import { writable } from 'svelte/store';
import { io, Socket } from 'socket.io-client';
import type { GameStateUpdatePayload, RoomInfo } from '../../../../types/game.js';

// Create a writable store for the socket connection
export const socket = writable<Socket | null>(null);

// Initialize socket connection
export function initializeSocket() {
    const socketInstance = io('http://localhost:3000'); // adjust port as needed
    socket.set(socketInstance);
    return socketInstance;
}

// Create a store for available rooms
export const availableRooms = writable<RoomInfo[]>([]); 