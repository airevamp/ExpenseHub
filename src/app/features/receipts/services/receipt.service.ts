import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ApiService, ConnectivityService, OfflineStorageService, SyncService } from '../../../core/services';
import { AuthService } from '../../../core/auth';
import { Receipt, ReceiptCreateRequest, ReceiptUpdateRequest } from '../../../core/models';
import { CameraService } from './camera.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly syncService = inject(SyncService);
  private readonly authService = inject(AuthService);
  private readonly cameraService = inject(CameraService);

  readonly receipts = signal<Receipt[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async loadReceipts(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Always load from local first for fast display
      const localReceipts = await this.offlineStorage.getReceipts(userId);
      this.receipts.set(localReceipts);

      // If online, sync and update
      if (this.connectivity.isOnline()) {
        await this.syncService.syncAll();
        const updatedReceipts = await this.offlineStorage.getReceipts(userId);
        this.receipts.set(updatedReceipts);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load receipts');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createReceipt(imageBlob: Blob, data?: Partial<ReceiptCreateRequest>): Promise<Receipt | null> {
    const userId = this.authService.getUserId();
    if (!userId) return null;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const now = new Date();
      const localId = `local-${uuidv4()}`;

      // Convert blob to base64 for offline storage
      const localImageData = await this.cameraService.blobToBase64(imageBlob);

      const receipt: Receipt = {
        id: localId,
        userId,
        localImageData,
        merchantName: data?.merchantName,
        transactionDate: data?.transactionDate,
        totalAmount: data?.totalAmount,
        currency: data?.currency || 'USD',
        category: data?.category,
        description: data?.description,
        ocrStatus: 'pending',
        syncStatus: 'pending_sync',
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      };

      // Save to local storage first
      await this.offlineStorage.saveReceipt(receipt);

      // Update local list
      this.receipts.update(list => [...list, receipt]);

      // If online, upload immediately
      if (this.connectivity.isOnline()) {
        await this.uploadAndSync(receipt, imageBlob);
      }

      return receipt;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to create receipt');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async uploadAndSync(receipt: Receipt, imageBlob: Blob): Promise<void> {
    try {
      // Get upload URL
      const fileName = `receipt-${Date.now()}.jpg`;
      const uploadInfo = await firstValueFrom(this.api.getUploadUrl(fileName));

      // Upload to blob storage
      await firstValueFrom(this.api.uploadToBlob(uploadInfo.uploadUrl, imageBlob));

      // Create receipt on server
      const createRequest: ReceiptCreateRequest = {
        blobUrl: uploadInfo.blobUrl,
        merchantName: receipt.merchantName,
        transactionDate: receipt.transactionDate,
        totalAmount: receipt.totalAmount,
        currency: receipt.currency,
        category: receipt.category,
        description: receipt.description
      };

      const serverReceipt = await firstValueFrom(this.api.createReceipt(createRequest));

      // Update local storage with server ID and blob URL
      await this.offlineStorage.updateReceiptId(receipt.id, serverReceipt.id);

      // Update local list
      this.receipts.update(list =>
        list.map(r => r.id === receipt.id ? { ...serverReceipt, syncStatus: 'synced' as const } : r)
      );
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      // Receipt stays in pending_sync state for later sync
    }
  }

  async updateReceipt(id: string, updates: ReceiptUpdateRequest): Promise<Receipt | null> {
    const userId = this.authService.getUserId();
    if (!userId) return null;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const existing = await this.offlineStorage.getReceipt(id);
      if (!existing) {
        throw new Error('Receipt not found');
      }

      const updated: Receipt = {
        ...existing,
        ...updates,
        syncStatus: 'pending_sync',
        updatedAt: new Date()
      };

      await this.offlineStorage.saveReceipt(updated);
      this.receipts.update(list => list.map(r => r.id === id ? updated : r));

      // Sync if online
      if (this.connectivity.isOnline() && !id.startsWith('local-')) {
        try {
          const serverReceipt = await firstValueFrom(this.api.updateReceipt(id, updates));
          updated.syncStatus = 'synced';
          await this.offlineStorage.saveReceipt(updated);
          this.receipts.update(list => list.map(r => r.id === id ? { ...serverReceipt, syncStatus: 'synced' as const } : r));
        } catch {
          // Stay in pending_sync state
        }
      }

      return updated;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to update receipt');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteReceipt(id: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.offlineStorage.deleteReceipt(id);
      this.receipts.update(list => list.filter(r => r.id !== id));

      // Sync deletion if online
      if (this.connectivity.isOnline() && !id.startsWith('local-')) {
        try {
          await firstValueFrom(this.api.deleteReceipt(id));
        } catch {
          // Deletion is marked locally, will sync later
        }
      }

      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to delete receipt');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  getReceiptById(id: string): Receipt | undefined {
    return this.receipts().find(r => r.id === id);
  }
}
