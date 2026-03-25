import mongoose, { Schema, Document } from 'mongoose';

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IBatch extends Document {
  batchId: string;
  status: BatchStatus;
  userIds: string[];
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  documentIds: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    userIds: [{ type: String, required: true }],
    totalDocuments: { type: Number, required: true },
    processedDocuments: { type: Number, default: 0 },
    failedDocuments: { type: Number, default: 0 },
    documentIds: [{ type: String }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);