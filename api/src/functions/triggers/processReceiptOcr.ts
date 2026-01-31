import { app, InvocationContext } from '@azure/functions';
import { analyzeReceipt } from '../../services/document-intelligence.service.js';
import { getReceiptsTableClient, ReceiptEntity } from '../../services/table.service.js';
import { odata } from '@azure/data-tables';

interface BlobTriggerContext {
  blobName: string;
  uri: string;
}

async function processReceiptOcr(
  blob: Buffer,
  context: InvocationContext
): Promise<void> {
  const triggerMetadata = context.triggerMetadata as unknown as BlobTriggerContext;
  const blobName = triggerMetadata?.blobName;
  const blobUrl = triggerMetadata?.uri;

  if (!blobName || !blobUrl) {
    context.error('Missing blob metadata');
    return;
  }

  context.log(`Processing receipt OCR for blob: ${blobName}`);

  // Extract userId and find the corresponding receipt
  const userId = blobName.split('/')[0];
  if (!userId) {
    context.error('Could not extract userId from blob name');
    return;
  }

  try {
    // Find receipt by blob URL
    const tableClient = getReceiptsTableClient();
    let receipt: ReceiptEntity | null = null;

    const filter = odata`PartitionKey eq ${userId} and BlobUrl eq ${blobUrl}`;
    for await (const entity of tableClient.listEntities<ReceiptEntity>({ queryOptions: { filter } })) {
      receipt = entity;
      break;
    }

    if (!receipt) {
      context.warn(`No receipt found for blob: ${blobUrl}`);
      return;
    }

    // Update status to processing
    receipt.OcrStatus = 'processing';
    receipt.UpdatedAt = new Date();
    await tableClient.updateEntity(receipt, 'Merge');

    // Perform OCR
    const ocrResult = await analyzeReceipt(blobUrl);

    // Update receipt with OCR results
    receipt.OcrStatus = 'completed';
    receipt.MerchantName = receipt.MerchantName || ocrResult.merchantName;
    receipt.TransactionDate = receipt.TransactionDate || ocrResult.transactionDate;
    receipt.TotalAmount = receipt.TotalAmount ?? ocrResult.totalAmount;
    receipt.Currency = receipt.Currency || ocrResult.currency || 'USD';
    receipt.UpdatedAt = new Date();

    await tableClient.updateEntity(receipt, 'Merge');
    context.log(`Successfully processed OCR for receipt: ${receipt.rowKey}`);

  } catch (error) {
    context.error('Error processing receipt OCR:', error);

    // Try to update receipt status to failed
    try {
      const tableClient = getReceiptsTableClient();
      const filter = odata`PartitionKey eq ${userId} and BlobUrl eq ${blobUrl}`;
      for await (const entity of tableClient.listEntities<ReceiptEntity>({ queryOptions: { filter } })) {
        entity.OcrStatus = 'failed';
        entity.UpdatedAt = new Date();
        await tableClient.updateEntity(entity, 'Merge');
        break;
      }
    } catch {
      context.error('Failed to update receipt status to failed');
    }
  }
}

app.storageBlob('processReceiptOcr', {
  path: 'receipts/{name}',
  connection: 'STORAGE_CONNECTION_STRING',
  handler: processReceiptOcr
});
