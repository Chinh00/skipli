import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import boardRoutes from './routes/boardRoutes';
import cardRoutes from './routes/cardRoutes';
import taskRoutes from './routes/taskRoutes';
import githubRoutes from './routes/githubRoutes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/boards/:boardId/cards', cardRoutes);
app.use('/boards/:boardId/cards/:cardId/tasks', taskRoutes);
app.use('/github', githubRoutes);

export default app;
