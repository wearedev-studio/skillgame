import { Schema, model } from 'mongoose';
import { Types } from 'mongoose';

const TokenSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    refreshToken: { type: String, required: true },
});

export default model('Token', TokenSchema);