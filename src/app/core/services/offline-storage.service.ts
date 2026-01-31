import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Receipt, TimeEntry, SyncQueueItem, SyncEntityType, SyncOperation } from '../models';
import { v4 as uuidv4 } from 'uuid';

class ExpenseHubDatabase extends Dexie {
  receipts!: Table<Receipt, string>;
  timeEntries!: Table<TimeEntry, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('ExpenseHubDB');

    this.version(1).stores({
      receipts: 'id, userId, syncStatus, createdAt, updatedAt',
      timeEntries: 'id, userId, syncStatus, date, createdAt',
      syncQueue: 'id, entityType, entityId, createdAt, retryCount'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private db: ExpenseHubDatabase;

  constructor() {
    this.db = new ExpenseHubDatabase();
  }

  // Receipt operations
  async getReceipts(userId: string): Promise<Receipt[]> {
    return this.db.receipts
      .where('userId')
      .equals(userId)
      .filter(r => !r.isDeleted)
      .toArray();
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    return this.db.receipts.get(id);
  }

  async saveReceipt(receipt: Receipt): Promise<void> {
    await this.db.receipts.put(receipt);
  }

  async saveReceipts(receipts: Receipt[]): Promise<void> {
    await this.db.receipts.bulkPut(receipts);
  }

  async deleteReceipt(id: string): Promise<void> {
    const receipt = await this.getReceipt(id);
    if (receipt) {
      receipt.isDeleted = true;
      receipt.syncStatus = 'pending_sync';
      receipt.updatedAt = new Date();
      await this.saveReceipt(receipt);
    }
  }

  async getPendingSyncReceipts(userId: string): Promise<Receipt[]> {
    return this.db.receipts
      .where({ userId, syncStatus: 'pending_sync' })
      .toArray();
  }

  // Time entry operations
  async getTimeEntries(userId: string): Promise<TimeEntry[]> {
    return this.db.timeEntries
      .where('userId')
      .equals(userId)
      .filter(t => !t.isDeleted)
      .toArray();
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.db.timeEntries.get(id);
  }

  async saveTimeEntry(entry: TimeEntry): Promise<void> {
    await this.db.timeEntries.put(entry);
  }

  async saveTimeEntries(entries: TimeEntry[]): Promise<void> {
    await this.db.timeEntries.bulkPut(entries);
  }

  async deleteTimeEntry(id: string): Promise<void> {
    const entry = await this.getTimeEntry(id);
    if (entry) {
      entry.isDeleted = true;
      entry.syncStatus = 'pending_sync';
      entry.updatedAt = new Date();
      await this.saveTimeEntry(entry);
    }
  }

  async getPendingSyncTimeEntries(userId: string): Promise<TimeEntry[]> {
    return this.db.timeEntries
      .where({ userId, syncStatus: 'pending_sync' })
      .toArray();
  }

  // Sync queue operations
  async addToSyncQueue(
    entityType: SyncEntityType,
    entityId: string,
    operation: SyncOperation,
    data: unknown
  ): Promise<void> {
    const item: SyncQueueItem = {
      id: uuidv4(),
      entityType,
      entityId,
      operation,
      data,
      retryCount: 0,
      createdAt: new Date()
    };
    await this.db.syncQueue.add(item);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .orderBy('createdAt')
      .toArray();
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.db.syncQueue.delete(id);
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    await this.db.syncQueue.put(item);
  }

  async clearSyncQueue(): Promise<void> {
    await this.db.syncQueue.clear();
  }

  async getSyncQueueByEntity(entityType: SyncEntityType, entityId: string): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .where({ entityType, entityId })
      .toArray();
  }

  // Update local entity ID after server sync
  async updateReceiptId(localId: string, serverId: string): Promise<void> {
    const receipt = await this.getReceipt(localId);
    if (receipt) {
      await this.db.receipts.delete(localId);
      receipt.id = serverId;
      receipt.syncStatus = 'synced';
      await this.db.receipts.add(receipt);
    }
  }

  async updateTimeEntryId(localId: string, serverId: string): Promise<void> {
    const entry = await this.getTimeEntry(localId);
    if (entry) {
      await this.db.timeEntries.delete(localId);
      entry.id = serverId;
      entry.syncStatus = 'synced';
      await this.db.timeEntries.add(entry);
    }
  }

  // Clear all local data
  async clearAllData(): Promise<void> {
    await this.db.receipts.clear();
    await this.db.timeEntries.clear();
    await this.db.syncQueue.clear();
  }
}
