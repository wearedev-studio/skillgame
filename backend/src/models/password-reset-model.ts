import { Schema, model } from 'mongoose';

const PasswordResetSchema = new Schema({
    email: { type: String, required: true },
    secretCode: { type: String, required: true },
    expires: { type: Date, required: true },
});

export default model('PasswordReset', PasswordResetSchema);