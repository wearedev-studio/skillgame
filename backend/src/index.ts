import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRouter from './routes/auth-router';
import userRouter from './routes/user-router';
import financialRouter from './routes/financial-router';
import kycRouter from './routes/kyc-router';
import tournamentRouter from './routes/tournament-router';
import adminRouter from './routes/admin-router'; // <-- Импорт нового админского роутера
import errorMiddleware from './middlewares/error-middleware';
import socketService from './services/socket-service';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, '..', 'public')));

// Роутеры
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/finance', financialRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/tournaments', tournamentRouter);
app.use('/api/admin', adminRouter); // <-- Подключение нового админского роутера

app.use(errorMiddleware);

const start = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Successfully connected to MongoDB');

        socketService.init(httpServer);

        httpServer.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error('Failed to start server:', e);
    }
};

start();