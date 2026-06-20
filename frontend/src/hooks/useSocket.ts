import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';

const useSocket = (boardId: string | undefined) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!boardId) return;

    socketRef.current = io(config.apiUrl);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket');
      socketRef.current?.emit('join-board', boardId);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [boardId]);

  return socketRef.current;
};

export default useSocket;
