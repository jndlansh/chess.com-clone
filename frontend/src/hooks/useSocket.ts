import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

const WS_URL = "wss://chess-com-backend.onrender.com";

export const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        if (!token) {
            // No token, don't connect
            setSocket(null);
            return;
        }

        console.log('[Socket] Connecting to WebSocket...');
        
        // Connect with token in query params
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        
        ws.onopen = () => {
            console.log('[Socket] WebSocket connected successfully');
            setSocket(ws);
        }

        ws.onclose = () => {
            console.log('[Socket] WebSocket disconnected');
            setSocket(null);
        }

        ws.onerror = (error) => {
            console.error('[Socket] WebSocket error:', error);
        }

        return () => {
            console.log('[Socket] Cleaning up WebSocket connection');
            ws.close();
        }
    }, [token])

    return socket;  
}