import http from 'http';
import { Server, Socket } from 'socket.io';
import app from './app';

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // In production, replace with specific origins
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-board', (boardId: string) => {
    socket.join(boardId);
    console.log(`User ${socket.id} joined board: ${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
