import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from '../game/GameManager.js';
import { registerGameHandlers } from './gameHandlers.js';

export function initializeSocketIO(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:8080"],
            methods: ["GET", "POST"]
        }
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