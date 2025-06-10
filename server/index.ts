import express, { Request, Response } from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSocketIO } from './sockets/index.js';

// Import database connection (this will initialize the pool)
import './db/connection.js';

// Import API routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import roomRoutes from './routes/rooms.js';
import leaderboardRoutes from './routes/leaderboard.js';

dotenv.config();

// Setup Express app
const app = express();
const server = createServer(app);

// Initialize socket.io with CORS configuration
const io = initializeSocketIO(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? ["https://team19.cs144.org"] // Updated to use HTTPS domain
            : ["http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

// Enable JSON parsing middleware
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ["https://team19.cs144.org"]
        : ["http://localhost:5173"]
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Enhanced health check with database connection test
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

// Static file serving (for production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = join(__dirname, '../client/dist');

// Serve static files from client/dist (built by the CI/CD)
app.use(express.static(clientDistPath));

// Also serve from public directory for any additional static assets
app.use(express.static('public'));

// SPA fallback (for production) - this should be last
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