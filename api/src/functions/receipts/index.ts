import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import {
  getReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  ReceiptEntity,
  ensureTablesExist
} from '../../services/table.service.js';
import { generateUploadUrl, ensureContainerExists } from '../../services/blob.service.js';

// Helper to extract user ID from request (from MSAL token claims)
function getUserId(request: HttpRequest): string | null {
  // In Azure Static Web Apps, the user info is in x-ms-client-principal header
  const clientPrincipal = request.headers.get('x-ms-client-principal');
  if (clientPrincipal) {
    try {
      const decoded = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString('utf8'));
      return decoded.userId || decoded.claims?.find((c: { typ: string; val: string }) => c.typ === 'sub')?.val;
    } catch {
      return null;
    }
  }
  // For development, use a default user ID
  return 'dev-user';
}

// GET /api/receipts
async function listReceipts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureTablesExist();
    const receipts = await getReceipts(userId);
    return { jsonBody: receipts };
  } catch (error) {
    context.error('Error listing receipts:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// GET /api/receipts/{id}
async function getReceiptById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const receiptId = request.params.id;
  if (!receiptId) {
    return { status: 400, body: 'Receipt ID is required' };
  }

  try {
    const receipt = await getReceipt(userId, receiptId);
    if (!receipt) {
      return { status: 404, body: 'Receipt not found' };
    }
    return { jsonBody: receipt };
  } catch (error) {
    context.error('Error getting receipt:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// POST /api/receipts
async function createReceiptHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureTablesExist();
    const body = await request.json() as Partial<ReceiptEntity>;
    const receiptId = uuidv4();
    const now = new Date();

    const receipt: ReceiptEntity = {
      partitionKey: userId,
      rowKey: receiptId,
      BlobUrl: body.BlobUrl,
      MerchantName: body.MerchantName,
      TransactionDate: body.TransactionDate,
      TotalAmount: body.TotalAmount,
      Currency: body.Currency || 'USD',
      Category: body.Category,
      Description: body.Description,
      OcrStatus: body.BlobUrl ? 'pending' : 'completed',
      SyncStatus: 'synced',
      IsDeleted: false,
      CreatedAt: now,
      UpdatedAt: now
    };

    await createReceipt(receipt);
    return { status: 201, jsonBody: receipt };
  } catch (error) {
    context.error('Error creating receipt:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// PUT /api/receipts/{id}
async function updateReceiptHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const receiptId = request.params.id;
  if (!receiptId) {
    return { status: 400, body: 'Receipt ID is required' };
  }

  try {
    const existing = await getReceipt(userId, receiptId);
    if (!existing) {
      return { status: 404, body: 'Receipt not found' };
    }

    const body = await request.json() as Partial<ReceiptEntity>;
    const updated: ReceiptEntity = {
      ...existing,
      MerchantName: body.MerchantName ?? existing.MerchantName,
      TransactionDate: body.TransactionDate ?? existing.TransactionDate,
      TotalAmount: body.TotalAmount ?? existing.TotalAmount,
      Currency: body.Currency ?? existing.Currency,
      Category: body.Category ?? existing.Category,
      Description: body.Description ?? existing.Description,
      UpdatedAt: new Date()
    };

    await updateReceipt(updated);
    return { jsonBody: updated };
  } catch (error) {
    context.error('Error updating receipt:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// DELETE /api/receipts/{id}
async function deleteReceiptHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const receiptId = request.params.id;
  if (!receiptId) {
    return { status: 400, body: 'Receipt ID is required' };
  }

  try {
    await deleteReceipt(userId, receiptId);
    return { status: 204 };
  } catch (error) {
    context.error('Error deleting receipt:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// POST /api/receipts/upload-url
async function getUploadUrl(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureContainerExists();
    const body = await request.json() as { fileName: string };
    const fileName = body.fileName || 'receipt.jpg';

    const result = generateUploadUrl(userId, fileName);
    return { jsonBody: result };
  } catch (error) {
    context.error('Error generating upload URL:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// Register functions
app.http('receipts-list', {
  methods: ['GET'],
  route: 'receipts',
  authLevel: 'anonymous',
  handler: listReceipts
});

app.http('receipts-get', {
  methods: ['GET'],
  route: 'receipts/{id}',
  authLevel: 'anonymous',
  handler: getReceiptById
});

app.http('receipts-create', {
  methods: ['POST'],
  route: 'receipts',
  authLevel: 'anonymous',
  handler: createReceiptHandler
});

app.http('receipts-update', {
  methods: ['PUT'],
  route: 'receipts/{id}',
  authLevel: 'anonymous',
  handler: updateReceiptHandler
});

app.http('receipts-delete', {
  methods: ['DELETE'],
  route: 'receipts/{id}',
  authLevel: 'anonymous',
  handler: deleteReceiptHandler
});

app.http('receipts-upload-url', {
  methods: ['POST'],
  route: 'receipts/upload-url',
  authLevel: 'anonymous',
  handler: getUploadUrl
});
