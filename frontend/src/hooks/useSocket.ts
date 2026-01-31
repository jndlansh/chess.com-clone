import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";

const WS_URL = "wss://chess-com-backend.onrender.com";

// Extended WebSocket type with message queue
export interface QueuedWebSocket extends WebSocket {
    messageQueue: MessageEvent[];
    isQueueing: boolean;
    gameHandler: ((event: MessageEvent) => void) | null;
}

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { token } = useContext(AuthContext);
    const wsRef = useRef<QueuedWebSocket | null>(null);
    const connectingRef = useRef(false);

    useEffect(() => {
        if (!token) {
            // No token, don't connect
            setSocket(null);
            return;
        }

        // Prevent duplicate connections - check both ref and connecting state
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            console.log('[Socket] Already connected or connecting, skipping');
            return;
        }
        
        if (connectingRef.current) {
            console.log('[Socket] Connection already in progress, skipping');
            return;
        }

        connectingRef.current = true;
        console.log('[Socket] Connecting to WebSocket...');
        
        // Connect with token in query params
        const ws = new WebSocket(`${WS_URL}?token=${token}`) as QueuedWebSocket;
        ws.messageQueue = [];
        ws.isQueueing = true;
        ws.gameHandler = null;
        wsRef.current = ws;
        
        // Central message handler - queues or forwards to game handler
        ws.onmessage = (event: MessageEvent) => {
            const msgType = JSON.parse(event.data).type;
            console.log('[Socket] Received message:', msgType, 'hasHandler:', !!ws.gameHandler);
            
            if (ws.gameHandler) {
                // Forward to the game handler immediately
                ws.gameHandler(event);
            } else {
                // No handler yet, queue it
                console.log('[Socket] Queueing message (no handler):', msgType);
                ws.messageQueue.push(event);
            }
        };
        
        ws.onopen = () => {
            console.log('[Socket] WebSocket connected successfully');
            connectingRef.current = false;
            setSocket(ws);
        }

        ws.onclose = () => {
            console.log('[Socket] WebSocket disconnected');
            connectingRef.current = false;
            setSocket(null);
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        }

        ws.onerror = (error) => {
            console.error('[Socket] WebSocket error:', error);
            connectingRef.current = false;
        }

        return () => {
            console.log('[Socket] Cleaning up WebSocket connection');
            connectingRef.current = false;
            ws.close();
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        }
    }, [token])

    return socket;  
}