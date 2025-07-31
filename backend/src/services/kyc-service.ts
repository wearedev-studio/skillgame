import KycRequestModel, { DocumentType, KycStatus } from '../models/kyc-request-model';
import UserModel from '../models/user-model';
import { ApiError } from '../exceptions/api-error';
import mongoose from 'mongoose';

class KycService {
    async submitRequest(userId: string, documentType: DocumentType, files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw ApiError.BadRequest('Необходимо загрузить файлы документов.');
        }
        
        const existingRequest = await KycRequestModel.findOne({ user: userId });
        if (existingRequest && (existingRequest.status === KycStatus.PENDING || existingRequest.status === KycStatus.APPROVED)) {
            throw ApiError.BadRequest('Ваша заявка уже находится на рассмотрении или была одобрена.');
        }

        const filePaths = files.map(file => `/uploads/kyc/${file.filename}`);
        
        // Если заявка была отклонена, создаем новую, иначе обновляем старую
        const kycRequest = await KycRequestModel.findOneAndUpdate(
            { user: userId },
            { 
                user: userId,
                documentType,
                files: filePaths,
                status: KycStatus.PENDING,
                submittedAt: new Date(),
                reviewedAt: undefined,
                adminNotes: undefined
            },
            { new: true, upsert: true }
        );

        // Обновляем статус пользователя
        await UserModel.findByIdAndUpdate(userId, { kycStatus: KycStatus.PENDING });
        
        return kycRequest;
    }
    
    async getUserKycStatus(userId: string) {
        const request = await KycRequestModel.findOne({ user: userId });
        if (!request) {
            return { status: KycStatus.NOT_SUBMITTED };
        }
        return request;
    }
    
    // --- Admin methods ---
    
    async getAllKycRequests(status: KycStatus | 'ALL', page: number, limit: number) {
        const query = status === 'ALL' ? {} : { status };
        const skip = (page - 1) * limit;
        
        const requests = await KycRequestModel.find(query)
            .populate('user', 'username email')
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await KycRequestModel.countDocuments(query);
        
        return { requests, total, page, pages: Math.ceil(total / limit) };
    }
    
    async reviewKycRequest(requestId: string, adminId: string, newStatus: KycStatus.APPROVED | KycStatus.REJECTED, adminNotes?: string) {
        if (newStatus === KycStatus.REJECTED && !adminNotes) {
            throw ApiError.BadRequest('Необходимо указать причину отклонения заявки.');
        }
        
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const kycRequest = await KycRequestModel.findById(requestId).session(session);
            if (!kycRequest) {
                throw ApiError.BadRequest('Заявка на верификацию не найдена.');
            }
            
            kycRequest.status = newStatus;
            kycRequest.reviewedAt = new Date();
            if (adminNotes) {
                kycRequest.adminNotes = adminNotes;
            }
            
            const user = await UserModel.findById(kycRequest.user).session(session);
            if (!user) {
                throw ApiError.BadRequest('Пользователь, связанный с заявкой, не найден.');
            }
            user.kycStatus = newStatus;

            await kycRequest.save({ session });
            await user.save({ session });
            
            await session.commitTransaction();
            
            // TODO: Отправить пользователю уведомление по email или socket о результате проверки
            
            return kycRequest;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export default new KycService();