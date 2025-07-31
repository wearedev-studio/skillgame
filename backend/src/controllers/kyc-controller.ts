import { NextFunction, Request, Response } from 'express';
import kycService from '../services/kyc-service';
import { ApiError } from '../exceptions/api-error';
import { DocumentType, KycStatus } from '../models/kyc-request-model';

class KycController {
    async submitRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const { documentType } = req.body;
            if (!Object.values(DocumentType).includes(documentType)) {
                return next(ApiError.BadRequest('Неверный тип документа.'));
            }
            const userId = req.user!.id;
            const files = req.files as Express.Multer.File[];
            const request = await kycService.submitRequest(userId, documentType, files);
            return res.status(201).json(request);
        } catch (e) {
            next(e);
        }
    }
    
    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const status = await kycService.getUserKycStatus(userId);
            return res.json(status);
        } catch (e) {
            next(e);
        }
    }

    // Admin routes moved to a separate controller for clarity
}

class AdminKycController {
     async getAllRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = (req.query.status as KycStatus | 'ALL') || 'ALL';

            const result = await kycService.getAllKycRequests(status, page, limit);
            return res.json(result);
        } catch (e) {
            next(e);
        }
    }

    async reviewRequest(req: Request, res: Response, next: NextFunction) {
         try {
             const { requestId } = req.params;
             const { status, notes } = req.body;
             const adminId = req.user!.id;

             if (status !== KycStatus.APPROVED && status !== KycStatus.REJECTED) {
                 return next(ApiError.BadRequest('Неверный статус для ревью.'));
             }

             const result = await kycService.reviewKycRequest(requestId, adminId, status, notes);
             return res.json(result);
        } catch (e) {
            next(e);
        }
    }
}

export const kycController = new KycController();
export const adminKycController = new AdminKycController();