import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from '../game/GameManager.js';
import { registerGameHandlers } from './gameHandlers.js';

export function initializeSocketIO(httpServer: HttpServer, options?: any) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? ["https://team19.cs144.org"]
                : ["http://localhost:5173", "http://localhost:8080"],
            methods: ["GET", "POST"]
        },
        // Merge any additional options passed in
        ...options
    });

    // Initialize GameManager
    const gameManager = new GameManager();

    // Handle socket connections
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Register game-related event handlers
        registerGameHandlers(io, socket, gameManager);
    });

    return io;
}