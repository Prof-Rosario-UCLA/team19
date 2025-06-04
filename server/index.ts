import express, { Request, Response } from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { initializeSocketIO } from './sockets/index.js';

// Setup Express app
const app = express();
const server = createServer(app);

// Initialize socket.io
initializeSocketIO(server);

// Enable JSON parsing middleware
app.use(express.json());

// Enable CORS for development
app.use(cors());

app.use(express.static('public'));

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
