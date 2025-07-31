import { Schema, model } from 'mongoose';

export enum KycStatus {
    NOT_SUBMITTED = 'NOT_SUBMITTED',
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum DocumentType {
    PASSPORT = 'PASSPORT',
    UTILITY_BILL = 'UTILITY_BILL',
    FOREIGN_PASSPORT = 'FOREIGN_PASSPORT',
    RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
}

const KycRequestSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: Object.values(KycStatus), default: KycStatus.PENDING },
    documentType: { type: String, enum: Object.values(DocumentType), required: true },
    files: [{ type: String, required: true }], // Пути к загруженным файлам
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    adminNotes: { type: String }, // Причина отклонения
});

export default model('KycRequest', KycRequestSchema);