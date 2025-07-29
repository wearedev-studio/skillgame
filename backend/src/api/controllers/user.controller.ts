import { Response } from 'express';
import { IAuthRequest } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';
import bcrypt from 'bcryptjs';

// @desc    Получить данные своего профиля
// @route   GET /api/users/me
// @access  Private
export const getMyProfile = async (req: IAuthRequest, res: Response) => {
    try {
        // req.userId добавляется нашим middleware 'protect'
        const user = await User.findById(req.userId).select('-passwordHash -passwordResetCode -passwordResetExpires');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// @desc    Обновить данные профиля (username, email)
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: IAuthRequest, res: Response) => {
    const { username, email } = req.body;
    
    // Валидация
    if (!username && !email) {
        return res.status(400).json({ message: 'Нет данных для обновления' });
    }

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверка, не занят ли новый email или username другим пользователем
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(400).json({ message: 'Этот email уже используется' });
            user.email = email;
        }
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ message: 'Это имя пользователя уже используется' });
            user.username = username;
        }

        const updatedUser = await user.save();

        res.json({
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// @desc    Сменить пароль
// @route   PUT /api/users/password
// @access  Private
export const changePassword = async (req: IAuthRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    
    // Валидация
    if (!oldPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Пожалуйста, проверьте все поля. Новый пароль должен быть не менее 6 символов.' });
    }
    
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Старый пароль неверен' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Логику для аватара и KYC добавим на следующих этапах, чтобы не перегружать текущий