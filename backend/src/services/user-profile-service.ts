import UserModel from '../models/user-model';
import { ApiError } from '../exceptions/api-error';
import bcrypt from 'bcrypt';
import { UserDto } from '../dtos/user-dto';

class UserProfileService {
    async updateUsername(userId: string, newUsername: string) {
        // Проверяем, не занято ли новое имя
        const existingUser = await UserModel.findOne({ username: newUsername });
        if (existingUser && existingUser._id.toString() !== userId) {
            throw ApiError.BadRequest(`Имя пользователя ${newUsername} уже занято.`);
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            throw ApiError.BadRequest('Пользователь не найден');
        }

        user.username = newUsername;
        await user.save();
        
        return new UserDto(user);
    }

    async updatePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw ApiError.BadRequest('Пользователь не найден');
        }

        const isPassEquals = await bcrypt.compare(oldPassword, user.password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Старый пароль неверный');
        }

        const hashPassword = await bcrypt.hash(newPassword, 3);
        user.password = hashPassword;
        await user.save();

        return new UserDto(user);
    }
    
    async updateAvatar(userId: string, avatarPath: string) {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw ApiError.BadRequest('Пользователь не найден');
        }

        // В будущем здесь можно добавить логику удаления старого файла аватара
        
        user.avatar = avatarPath;
        await user.save();

        return new UserDto(user);
    }
}

export default new UserProfileService();