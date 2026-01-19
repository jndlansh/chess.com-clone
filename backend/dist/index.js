import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { GameManager } from './GameManager.js';
import authRoutes from './routes/auth.js';
import { verifyToken } from './auth.js';
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Routes
app.use('/auth', authRoutes);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Create HTTP server
const server = createServer(app);
// Create WebSocket server
const wss = new WebSocketServer({ server });
const gameManager = new GameManager();
wss.on('connection', (ws, req) => {
    // Extract token from query parameters
    const url = new URL(req.url, `ws://localhost:8080`);
    const token = url.searchParams.get('token');
    if (!token) {
        ws.close(1008, 'Unauthorized: No token provided');
        return;
    }
    try {
        // Verify token and extract user ID
        const { userId } = verifyToken(token);
        // Add user to game manager
        gameManager.addUser(ws, userId);
        // Handle disconnection
        ws.on('close', () => {
            gameManager.removeUser(ws);
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }
    catch (error) {
        console.error('Authentication error:', error);
        ws.close(1008, 'Unauthorized: Invalid token');
    }
});
// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map