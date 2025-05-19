import express from 'express';
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
        origin: "http://localhost:5173", // This is the default Vite dev server port
        methods: ["GET", "POST"]
    }
});

// Enable JSON parsing middleware
app.use(express.json());

// Enable CORS for development
app.use(cors());

// Get directory paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDistPath = join(__dirname, '../client/dist');

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle chat messages
    socket.on('chat message', (msg) => {
        console.log('Message received:', msg);
        io.emit('chat message', msg); // Broadcast to all clients
    });

    // Handle game-specific events here
    // ...

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Static file serving (for production)
app.use(express.static(clientDistPath));

// SPA fallback (for production)
app.get('*', (req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});