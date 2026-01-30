import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";

const WS_URL = "ws://localhost:8080";

// Extended WebSocket type with message queue
interface QueuedWebSocket extends WebSocket {
    messageQueue: MessageEvent[];
    flushQueue: () => void;
}

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { token } = useContext(AuthContext);
    const wsRef = useRef<QueuedWebSocket | null>(null);

    useEffect(() => {
        if (!token) {
            // No token, don't connect
            setSocket(null);
            return;
        }

        // Prevent duplicate connections
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        console.log('[Socket] Connecting to WebSocket...');
        
        // Connect with token in query params
        const ws = new WebSocket(`${WS_URL}?token=${token}`) as QueuedWebSocket;
        ws.messageQueue = [];
        wsRef.current = ws;
        
        // Queue messages that arrive before the React component mounts its listener
        const queueHandler = (event: MessageEvent) => {
            console.log('[Socket] Queueing message:', event.data);
            ws.messageQueue.push(event);
        };
        
        ws.addEventListener('message', queueHandler);
        
        // Provide a method to flush queued messages to a new handler
        ws.flushQueue = () => {
            ws.removeEventListener('message', queueHandler);
            // Messages will now go directly to the component's handler
        };
        
        ws.onopen = () => {
            console.log('[Socket] WebSocket connected successfully');
            setSocket(ws);
        }

        ws.onclose = () => {
            console.log('[Socket] WebSocket disconnected');
            setSocket(null);
            wsRef.current = null;
        }

        ws.onerror = (error) => {
            console.error('[Socket] WebSocket error:', error);
        }

        return () => {
            console.log('[Socket] Cleaning up WebSocket connection');
            ws.close();
            wsRef.current = null;
        }
    }, [token])

    return socket;  
}