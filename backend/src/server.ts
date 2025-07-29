import express, { Application, Request, Response } from 'express';
import { createServer } from 'http'; // <-- Импортируем createServer
import { Server } from 'socket.io';   // <-- Импортируем Server из socket.io
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './api/routes/auth.routes';
import userRoutes from './api/routes/user.routes';
import { initializeSocket } from './socket'; // <-- Импортируем наш будущий обработчик сокетов

dotenv.config();

const app: Application = express();
const httpServer = createServer(app); // <-- Создаем HTTP сервер на базе Express
const io = new Server(httpServer, { // <-- Инициализируем Socket.io
    cors: {
        origin: "http://localhost:5173", // URL нашего React-клиента
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('API is running...');
});

// Инициализируем всю логику сокетов
initializeSocket(io);

const startServer = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI must be defined in .env file');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
        
        httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`)); // <-- Запускаем httpServer
    } catch (error: any) {
        console.error(error.message);
        process.exit(1);
    }
};

startServer();