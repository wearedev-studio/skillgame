import UserModel from '../models/user-model';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import mailService from './mail-service';
import tokenService from './token-service';
import { UserDto } from '../dtos/user-dto';
import { ApiError } from '../exceptions/api-error';
import {IUser} from "../types/IUser";
import PasswordResetModel from '../models/password-reset-model';


class UserService {
    async registration(username: string, email: string, password: string) {
        const candidateByEmail = await UserModel.findOne({ email });
        if (candidateByEmail) {
            throw ApiError.BadRequest(`Пользователь с почтовым адресом ${email} уже существует`);
        }

        const candidateByUsername = await UserModel.findOne({ username });
        if (candidateByUsername) {
            throw ApiError.BadRequest(`Пользователь с именем ${username} уже существует`);
        }

        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = uuidv4();

        const user = await UserModel.create({
            username,
            email,
            password: hashPassword,
            activationLink,
        });

        await mailService.sendActivationMail(email, `${process.env.CLIENT_URL}/api/auth/activate/${activationLink}`);

        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({ ...userDto });
        // @ts-ignore
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return { ...tokens, user: userDto };
    }

    async activate(activationLink: string) {
        const user = await UserModel.findOne({ activationLink });
        if (!user) {
            throw ApiError.BadRequest('Неккоректная ссылка активации');
        }
        user.isActivated = true;
        await user.save();
    }
    
    async login(email: string, password: string) {
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw ApiError.BadRequest('Пользователь с таким email не найден');
        }
        const isPassEquals = await bcrypt.compare(password, user.password);
        if (!isPassEquals) {
            throw ApiError.BadRequest('Неверный пароль');
        }
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({ ...userDto });
        // @ts-ignore
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return { ...tokens, user: userDto };
    }

    async logout(refreshToken: string) {
        const token = await tokenService.removeToken(refreshToken);
        return token;
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw ApiError.UnauthorizedError();
        }
        const userData = tokenService.validateRefreshToken(refreshToken) as IUser | null;
        const tokenFromDb = await tokenService.findToken(refreshToken);
        
        if (!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }

        const user = await UserModel.findById(userData.id);
        if (!user) {
            throw ApiError.BadRequest('Пользователь не найден');
        }
        
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({ ...userDto });
        // @ts-ignore
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return { ...tokens, user: userDto };
    }

        // НОВЫЙ МЕТОД
    async forgotPassword(email: string) {
        const user = await UserModel.findOne({ email });
        if (!user) throw ApiError.BadRequest('Пользователь с таким email не найден');
        
        // Генерируем случайный 6-значный код
        const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // Код действителен 10 минут
        
        await PasswordResetModel.findOneAndUpdate(
            { email },
            { email, secretCode, expires },
            { upsert: true, new: true }
        );
            
        await mailService.sendPasswordResetCode(email, secretCode);
    }
    
    // НОВЫЙ МЕТОД
    async resetPassword(email: string, secretCode: string, newPassword: string) {
        const resetRequest = await PasswordResetModel.findOne({ email, secretCode });
        if (!resetRequest) throw ApiError.BadRequest('Неверный email или секретный код.');
        if (resetRequest.expires < new Date()) throw ApiError.BadRequest('Срок действия кода истек.');

        const user = await UserModel.findOne({ email });
        if (!user) throw ApiError.BadRequest('Пользователь не найден.'); // На всякий случай

        user.password = await bcrypt.hash(newPassword, 3);
        await user.save();
        
        // Удаляем запрос на сброс после успешного использования
        await PasswordResetModel.deleteOne({ email });
    }
}

export default new UserService();