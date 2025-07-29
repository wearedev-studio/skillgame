import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { sendPasswordResetEmail } from '../services/email.service';

// --- РЕГИСТРАЦИЯ ---
export const register = async (req: Request, res: Response) => {
    const { email, username, password } = req.body;

    // Валидация
    if (!email || !username || !password) {
        return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Пароль должен содержать не менее 6 символов' });
    }
    // Простая проверка email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'Некорректный формат email' });
    }

    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'Пользователь с таким email или username уже существует' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            email,
            username,
            passwordHash,
        });

        await newUser.save();

        // Создаем токен для автоматического входа после регистрации
        const payload = { userId: newUser.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// --- АВТОРИЗАЦИЯ ---
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Неверные учетные данные' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверные учетные данные' });
        }

        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// --- СБРОС ПАРОЛЯ: ЗАПРОС КОДА ---
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email обязателен' });

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь с таким email не найден' });
        }

        const resetCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-значный код
        user.passwordResetCode = resetCode;
        user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

        await user.save();

        // Отправка email
        await sendPasswordResetEmail(user.email, resetCode);
        
        res.status(200).json({ message: 'Код для сброса пароля отправлен на ваш email' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при отправке email' });
    }
};

// --- СБРОС ПАРОЛЯ: ПОДТВЕРЖДЕНИЕ КОДА И НОВЫЙ ПАРОЛЬ ---
export const resetPassword = async (req: Request, res: Response) => {
    const { email, secretCode, newPassword } = req.body;
    if (!email || !secretCode || !newPassword) {
        return res.status(400).json({ message: 'Все поля обязательны' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Новый пароль должен содержать не менее 6 символов' });
    }

    try {
        const user = await User.findOne({
            email,
            passwordResetCode: secretCode,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Неверный или истекший код сброса' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.passwordResetCode = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Пароль успешно сброшен' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};