import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineStorageService } from './offline-storage.service';
import { ConnectivityService } from './connectivity.service';
import { AuthService } from '../auth';
import { BatchSyncRequest, SyncBatchItem, Receipt, TimeEntry } from '../models';

export type SyncState = 'idle' | 'syncing' | 'error';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly authService = inject(AuthService);

  readonly syncState = signal<SyncState>('idle');
  readonly lastSyncTime = signal<Date | null>(null);
  readonly pendingChangesCount = signal(0);
  readonly syncError = signal<string | null>(null);

  private syncInProgress = false;

  constructor() {
    // Auto-sync when coming online
    this.setupAutoSync();
  }

  private setupAutoSync(): void {
    // Check for pending changes periodically
    setInterval(() => this.updatePendingCount(), 30000);

    // Trigger sync when online status changes to true
    // Note: We use an effect-like pattern here
    let wasOffline = !this.connectivity.isOnline();
    setInterval(() => {
      const isNowOnline = this.connectivity.isOnline();
      if (isNowOnline && wasOffline) {
        this.syncAll();
      }
      wasOffline = !isNowOnline;
    }, 1000);
  }

  private async updatePendingCount(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const pendingReceipts = await this.offlineStorage.getPendingSyncReceipts(userId);
    const pendingTimeEntries = await this.offlineStorage.getPendingSyncTimeEntries(userId);

    this.pendingChangesCount.set(pendingReceipts.length + pendingTimeEntries.length);
  }

  async syncAll(): Promise<boolean> {
    if (this.syncInProgress || !this.connectivity.isOnline()) {
      return false;
    }

    const userId = this.authService.getUserId();
    if (!userId) return false;

    this.syncInProgress = true;
    this.syncState.set('syncing');
    this.syncError.set(null);

    try {
      // Get pending changes
      const pendingReceipts = await this.offlineStorage.getPendingSyncReceipts(userId);
      const pendingTimeEntries = await this.offlineStorage.getPendingSyncTimeEntries(userId);

      if (pendingReceipts.length === 0 && pendingTimeEntries.length === 0) {
        // No pending changes, just fetch latest from server
        await this.fetchFromServer();
        this.syncState.set('idle');
        this.lastSyncTime.set(new Date());
        return true;
      }

      // Build batch sync request
      const request: BatchSyncRequest = {
        receipts: this.buildReceiptSyncItems(pendingReceipts),
        timeEntries: this.buildTimeEntrySyncItems(pendingTimeEntries)
      };

      // Send to server
      const response = await firstValueFrom(this.api.batchSync(request));

      // Process results
      for (const result of response.results) {
        if (result.success) {
          if (result.entityType === 'receipt') {
            if (result.localId && result.entityId !== result.localId) {
              // Update local ID to server ID
              await this.offlineStorage.updateReceiptId(result.localId, result.entityId);
            } else {
              // Mark as synced
              const receipt = await this.offlineStorage.getReceipt(result.entityId);
              if (receipt) {
                receipt.syncStatus = 'synced';
                await this.offlineStorage.saveReceipt(receipt);
              }
            }
          } else if (result.entityType === 'time-entry') {
            if (result.localId && result.entityId !== result.localId) {
              await this.offlineStorage.updateTimeEntryId(result.localId, result.entityId);
            } else {
              const entry = await this.offlineStorage.getTimeEntry(result.entityId);
              if (entry) {
                entry.syncStatus = 'synced';
                await this.offlineStorage.saveTimeEntry(entry);
              }
            }
          }
        }
      }

      // Fetch latest from server to get any updates
      await this.fetchFromServer();

      await this.updatePendingCount();
      this.syncState.set('idle');
      this.lastSyncTime.set(new Date());
      return true;

    } catch (error) {
      console.error('Sync error:', error);
      this.syncState.set('error');
      this.syncError.set(error instanceof Error ? error.message : 'Sync failed');
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  private buildReceiptSyncItems(receipts: Receipt[]): SyncBatchItem[] {
    return receipts.map(receipt => {
      // Determine operation based on state
      let operation: 'create' | 'update' | 'delete';
      if (receipt.isDeleted) {
        operation = 'delete';
      } else if (!receipt.id.startsWith('local-')) {
        operation = 'update';
      } else {
        operation = 'create';
      }

      return {
        operation,
        entityId: receipt.id,
        data: {
          blobUrl: receipt.blobUrl,
          merchantName: receipt.merchantName,
          transactionDate: receipt.transactionDate?.toISOString(),
          totalAmount: receipt.totalAmount,
          currency: receipt.currency,
          category: receipt.category,
          description: receipt.description
        }
      };
    });
  }

  private buildTimeEntrySyncItems(entries: TimeEntry[]): SyncBatchItem[] {
    return entries.map(entry => {
      let operation: 'create' | 'update' | 'delete';
      if (entry.isDeleted) {
        operation = 'delete';
      } else if (!entry.id.startsWith('local-')) {
        operation = 'update';
      } else {
        operation = 'create';
      }

      return {
        operation,
        entityId: entry.id,
        data: {
          date: entry.date.toISOString(),
          hours: entry.hours,
          description: entry.description,
          project: entry.project
        }
      };
    });
  }

  private async fetchFromServer(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    try {
      const [serverReceipts, serverTimeEntries] = await Promise.all([
        firstValueFrom(this.api.getReceipts()),
        firstValueFrom(this.api.getTimeEntries())
      ]);

      // Merge with local data (server wins for synced items)
      for (const serverReceipt of serverReceipts) {
        const localReceipt = await this.offlineStorage.getReceipt(serverReceipt.id);
        if (!localReceipt || localReceipt.syncStatus === 'synced') {
          await this.offlineStorage.saveReceipt({
            ...serverReceipt,
            syncStatus: 'synced'
          });
        }
      }

      for (const serverEntry of serverTimeEntries) {
        const localEntry = await this.offlineStorage.getTimeEntry(serverEntry.id);
        if (!localEntry || localEntry.syncStatus === 'synced') {
          await this.offlineStorage.saveTimeEntry({
            ...serverEntry,
            syncStatus: 'synced'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching from server:', error);
      throw error;
    }
  }
}
