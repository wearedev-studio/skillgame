import { Router } from 'express';
import authMiddleware from '../middlewares/auth-middleware';
import { kycController, adminKycController } from '../controllers/kyc-controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import adminMiddleware from "../middlewares/admin-middleware";

// --- Настройка Multer для загрузки KYC документов ---
const kycStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/kyc';
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const userId = req.user!.id;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${userId}-doc-${uniqueSuffix}${extension}`);
    },
});

const uploadKyc = multer({
    storage: kycStorage,
    limits: { fileSize: 1024 * 1024 * 10 }, // Лимит 10 МБ
});

const userRouter = Router();
const adminRouter = Router();

// --- User Routes ---
userRouter.use(authMiddleware);
userRouter.post('/submit', uploadKyc.array('documents', 5), kycController.submitRequest); // 'documents' - имя поля, до 5 файлов
userRouter.get('/status', kycController.getStatus);

// --- Admin Routes ---
adminRouter.use(authMiddleware, adminMiddleware);
adminRouter.get('/requests', adminKycController.getAllRequests);
adminRouter.patch('/review/:requestId', adminKycController.reviewRequest);

// --- Main Router ---
const mainRouter = Router();
mainRouter.use('/', userRouter);
mainRouter.use('/admin', adminRouter);

export default mainRouter;