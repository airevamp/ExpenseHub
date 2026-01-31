export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncEntityType = 'receipt' | 'time-entry';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data: unknown;
  retryCount: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

export interface BatchSyncRequest {
  receipts: SyncBatchItem[];
  timeEntries: SyncBatchItem[];
}

export interface SyncBatchItem {
  operation: SyncOperation;
  entityId: string;
  data: unknown;
}

export interface BatchSyncResponse {
  success: boolean;
  results: SyncResult[];
  errors: SyncError[];
}

export interface SyncResult {
  entityType: SyncEntityType;
  entityId: string;
  localId?: string;
  operation: SyncOperation;
  success: boolean;
  serverData?: unknown;
}

export interface SyncError {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  error: string;
  code: string;
}
