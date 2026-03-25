import mongoose, { Schema, Document } from 'mongoose';

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IDocument extends Document {
  documentId: string;
  batchId: string;
  userId: string;
  status: DocumentStatus;
  gridfsFileId?: mongoose.Types.ObjectId;
  filename?: string;
  error?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    documentId: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    gridfsFileId: { type: Schema.Types.ObjectId },
    filename: { type: String },
    error: { type: String },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);