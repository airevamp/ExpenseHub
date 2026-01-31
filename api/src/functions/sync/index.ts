import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import {
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  getTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  ReceiptEntity,
  TimeEntryEntity,
  ensureTablesExist
} from '../../services/table.service.js';

interface SyncOperation {
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  data?: Record<string, unknown>;
}

interface BatchSyncRequest {
  receipts: SyncOperation[];
  timeEntries: SyncOperation[];
}

interface SyncResult {
  entityType: 'receipt' | 'time-entry';
  entityId: string;
  localId?: string;
  operation: string;
  success: boolean;
  serverData?: unknown;
  error?: string;
}

interface BatchSyncResponse {
  success: boolean;
  results: SyncResult[];
  errors: SyncResult[];
}

function getUserId(request: HttpRequest): string | null {
  const clientPrincipal = request.headers.get('x-ms-client-principal');
  if (clientPrincipal) {
    try {
      const decoded = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString('utf8'));
      return decoded.userId || decoded.claims?.find((c: { typ: string; val: string }) => c.typ === 'sub')?.val;
    } catch {
      return null;
    }
  }
  return 'dev-user';
}

async function batchSync(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureTablesExist();
    const body = await request.json() as BatchSyncRequest;
    const response: BatchSyncResponse = {
      success: true,
      results: [],
      errors: []
    };

    // Process receipts
    for (const op of body.receipts || []) {
      try {
        const result = await processReceiptOperation(userId, op);
        response.results.push(result);
      } catch (error) {
        response.errors.push({
          entityType: 'receipt',
          entityId: op.entityId,
          operation: op.operation,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        response.success = false;
      }
    }

    // Process time entries
    for (const op of body.timeEntries || []) {
      try {
        const result = await processTimeEntryOperation(userId, op);
        response.results.push(result);
      } catch (error) {
        response.errors.push({
          entityType: 'time-entry',
          entityId: op.entityId,
          operation: op.operation,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        response.success = false;
      }
    }

    return { jsonBody: response };
  } catch (error) {
    context.error('Error in batch sync:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

async function processReceiptOperation(userId: string, op: SyncOperation): Promise<SyncResult> {
  const now = new Date();

  switch (op.operation) {
    case 'create': {
      const data = op.data || {};
      const serverId = uuidv4();
      const receipt: ReceiptEntity = {
        partitionKey: userId,
        rowKey: serverId,
        BlobUrl: data.blobUrl as string | undefined,
        MerchantName: data.merchantName as string | undefined,
        TransactionDate: data.transactionDate ? new Date(data.transactionDate as string) : undefined,
        TotalAmount: data.totalAmount as number | undefined,
        Currency: (data.currency as string) || 'USD',
        Category: data.category as string | undefined,
        Description: data.description as string | undefined,
        OcrStatus: data.blobUrl ? 'pending' : 'completed',
        SyncStatus: 'synced',
        IsDeleted: false,
        CreatedAt: now,
        UpdatedAt: now
      };
      await createReceipt(receipt);
      return {
        entityType: 'receipt',
        entityId: serverId,
        localId: op.entityId,
        operation: 'create',
        success: true,
        serverData: receipt
      };
    }

    case 'update': {
      const existing = await getReceipt(userId, op.entityId);
      if (!existing) {
        throw new Error('Receipt not found');
      }
      const data = op.data || {};
      const updated: ReceiptEntity = {
        ...existing,
        MerchantName: data.merchantName as string ?? existing.MerchantName,
        TransactionDate: data.transactionDate ? new Date(data.transactionDate as string) : existing.TransactionDate,
        TotalAmount: data.totalAmount as number ?? existing.TotalAmount,
        Currency: data.currency as string ?? existing.Currency,
        Category: data.category as string ?? existing.Category,
        Description: data.description as string ?? existing.Description,
        SyncStatus: 'synced',
        UpdatedAt: now
      };
      await updateReceipt(updated);
      return {
        entityType: 'receipt',
        entityId: op.entityId,
        operation: 'update',
        success: true,
        serverData: updated
      };
    }

    case 'delete': {
      await deleteReceipt(userId, op.entityId);
      return {
        entityType: 'receipt',
        entityId: op.entityId,
        operation: 'delete',
        success: true
      };
    }

    default:
      throw new Error(`Unknown operation: ${op.operation}`);
  }
}

async function processTimeEntryOperation(userId: string, op: SyncOperation): Promise<SyncResult> {
  const now = new Date();

  switch (op.operation) {
    case 'create': {
      const data = op.data || {};
      const serverId = uuidv4();
      const entry: TimeEntryEntity = {
        partitionKey: userId,
        rowKey: serverId,
        Date: new Date(data.date as string),
        Hours: data.hours as number,
        Description: (data.description as string) || '',
        Project: data.project as string | undefined,
        SyncStatus: 'synced',
        IsDeleted: false,
        CreatedAt: now,
        UpdatedAt: now
      };
      await createTimeEntry(entry);
      return {
        entityType: 'time-entry',
        entityId: serverId,
        localId: op.entityId,
        operation: 'create',
        success: true,
        serverData: entry
      };
    }

    case 'update': {
      const existing = await getTimeEntry(userId, op.entityId);
      if (!existing) {
        throw new Error('Time entry not found');
      }
      const data = op.data || {};
      const updated: TimeEntryEntity = {
        ...existing,
        Date: data.date ? new Date(data.date as string) : existing.Date,
        Hours: data.hours as number ?? existing.Hours,
        Description: data.description as string ?? existing.Description,
        Project: data.project as string ?? existing.Project,
        SyncStatus: 'synced',
        UpdatedAt: now
      };
      await updateTimeEntry(updated);
      return {
        entityType: 'time-entry',
        entityId: op.entityId,
        operation: 'update',
        success: true,
        serverData: updated
      };
    }

    case 'delete': {
      await deleteTimeEntry(userId, op.entityId);
      return {
        entityType: 'time-entry',
        entityId: op.entityId,
        operation: 'delete',
        success: true
      };
    }

    default:
      throw new Error(`Unknown operation: ${op.operation}`);
  }
}

app.http('sync', {
  methods: ['POST'],
  route: 'sync',
  authLevel: 'anonymous',
  handler: batchSync
});
