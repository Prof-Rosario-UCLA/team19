import express, { Request, Response } from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import cors from 'cors';

// Setup Express app
const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Enable JSON parsing middleware
app.use(express.json());

// Enable CORS for development
app.use(cors());

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = join(__dirname, '../client/dist');

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('chat message', (msg: string) => {
        console.log('Message received:', msg);
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

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
});
