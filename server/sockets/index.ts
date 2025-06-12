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
        ...options
    });

    const gameManager = new GameManager();

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        registerGameHandlers(io, socket, gameManager);
    });

    return io;
}