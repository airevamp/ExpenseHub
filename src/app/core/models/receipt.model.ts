export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SyncStatus = 'synced' | 'pending_sync' | 'sync_error';

export interface Receipt {
  id: string;
  userId: string;
  blobUrl?: string;
  localImageData?: string; // Base64 for offline storage
  merchantName?: string;
  transactionDate?: Date;
  totalAmount?: number;
  currency: string;
  category?: string;
  description?: string;
  ocrStatus: OcrStatus;
  syncStatus: SyncStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptCreateRequest {
  blobUrl?: string;
  merchantName?: string;
  transactionDate?: Date;
  totalAmount?: number;
  currency?: string;
  category?: string;
  description?: string;
}

export interface ReceiptUpdateRequest {
  merchantName?: string;
  transactionDate?: Date;
  totalAmount?: number;
  currency?: string;
  category?: string;
  description?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  blobUrl: string;
  expiresAt: Date;
}

export const EXPENSE_CATEGORIES = [
  'Meals & Entertainment',
  'Transportation',
  'Lodging',
  'Office Supplies',
  'Software & Subscriptions',
  'Professional Services',
  'Travel',
  'Utilities',
  'Equipment',
  'Other'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
