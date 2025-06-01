import express, { Request, Response } from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import './db/connection.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roomRoutes from './routes/rooms.js';
import leaderboardRoutes from './routes/leaderboard.js';

dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ["http://34.169.247.106"] // GKE IP
            : ["http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());

// App routes
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = join(__dirname, '../client/dist');
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
    try {
        // Test database connection
        const { query } = await import('./db/connection.js');
        const result = await query('SELECT NOW() as current_time, version() as db_version');

        res.json({
            status: 'ok',
            message: 'Server and database are running',
            database: 'connected',
            timestamp: result.rows[0].current_time,
            database_version: result.rows[0].db_version.split(' ')[0],
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            environment: process.env.NODE_ENV || 'development'
        });
    }
});

// Socket.IO
// Fill in later

// Static file serving (for production)
app.use(express.static(clientDistPath));

// SPA fallback (for production)
app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(clientDistPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});