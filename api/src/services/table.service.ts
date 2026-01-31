import { TableClient, TableEntity, odata } from '@azure/data-tables';

const connectionString = process.env.STORAGE_CONNECTION_STRING || '';

export interface ReceiptEntity extends TableEntity {
  BlobUrl?: string;
  MerchantName?: string;
  TransactionDate?: Date;
  TotalAmount?: number;
  Currency: string;
  Category?: string;
  Description?: string;
  OcrStatus: string;
  SyncStatus: string;
  IsDeleted: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TimeEntryEntity extends TableEntity {
  Date: Date;
  Hours: number;
  Description: string;
  Project?: string;
  SyncStatus: string;
  IsDeleted: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

let receiptsClient: TableClient | null = null;
let timeEntriesClient: TableClient | null = null;

export function getReceiptsTableClient(): TableClient {
  if (!receiptsClient) {
    receiptsClient = TableClient.fromConnectionString(connectionString, 'Receipts');
  }
  return receiptsClient;
}

export function getTimeEntriesTableClient(): TableClient {
  if (!timeEntriesClient) {
    timeEntriesClient = TableClient.fromConnectionString(connectionString, 'TimeEntries');
  }
  return timeEntriesClient;
}

export async function ensureTablesExist(): Promise<void> {
  const receiptsTable = getReceiptsTableClient();
  const timeEntriesTable = getTimeEntriesTableClient();

  await receiptsTable.createTable().catch(() => {});
  await timeEntriesTable.createTable().catch(() => {});
}

// Receipt operations
export async function getReceipts(userId: string, includeDeleted = false): Promise<ReceiptEntity[]> {
  const client = getReceiptsTableClient();
  const filter = includeDeleted
    ? odata`PartitionKey eq ${userId}`
    : odata`PartitionKey eq ${userId} and IsDeleted eq false`;

  const entities: ReceiptEntity[] = [];
  for await (const entity of client.listEntities<ReceiptEntity>({ queryOptions: { filter } })) {
    entities.push(entity);
  }
  return entities;
}

export async function getReceipt(userId: string, receiptId: string): Promise<ReceiptEntity | null> {
  const client = getReceiptsTableClient();
  try {
    return await client.getEntity<ReceiptEntity>(userId, receiptId);
  } catch {
    return null;
  }
}

export async function createReceipt(receipt: ReceiptEntity): Promise<void> {
  const client = getReceiptsTableClient();
  await client.createEntity(receipt);
}

export async function updateReceipt(receipt: ReceiptEntity): Promise<void> {
  const client = getReceiptsTableClient();
  await client.updateEntity(receipt, 'Merge');
}

export async function deleteReceipt(userId: string, receiptId: string): Promise<void> {
  const client = getReceiptsTableClient();
  const receipt = await getReceipt(userId, receiptId);
  if (receipt) {
    receipt.IsDeleted = true;
    receipt.UpdatedAt = new Date();
    await updateReceipt(receipt);
  }
}

// Time entry operations
export async function getTimeEntries(userId: string, includeDeleted = false): Promise<TimeEntryEntity[]> {
  const client = getTimeEntriesTableClient();
  const filter = includeDeleted
    ? odata`PartitionKey eq ${userId}`
    : odata`PartitionKey eq ${userId} and IsDeleted eq false`;

  const entities: TimeEntryEntity[] = [];
  for await (const entity of client.listEntities<TimeEntryEntity>({ queryOptions: { filter } })) {
    entities.push(entity);
  }
  return entities;
}

export async function getTimeEntry(userId: string, entryId: string): Promise<TimeEntryEntity | null> {
  const client = getTimeEntriesTableClient();
  try {
    return await client.getEntity<TimeEntryEntity>(userId, entryId);
  } catch {
    return null;
  }
}

export async function createTimeEntry(entry: TimeEntryEntity): Promise<void> {
  const client = getTimeEntriesTableClient();
  await client.createEntity(entry);
}

export async function updateTimeEntry(entry: TimeEntryEntity): Promise<void> {
  const client = getTimeEntriesTableClient();
  await client.updateEntity(entry, 'Merge');
}

export async function deleteTimeEntry(userId: string, entryId: string): Promise<void> {
  const client = getTimeEntriesTableClient();
  const entry = await getTimeEntry(userId, entryId);
  if (entry) {
    entry.IsDeleted = true;
    entry.UpdatedAt = new Date();
    await updateTimeEntry(entry);
  }
}
