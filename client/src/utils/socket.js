import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL);

export const subscribeToPrices = (callback) => {
    socket.on('price_update', callback);
    return () => socket.off('price_update', callback);
};
