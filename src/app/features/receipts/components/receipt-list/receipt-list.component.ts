import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';
import { SyncService, ConnectivityService } from '../../../../core/services';
import { Receipt } from '../../../../core/models';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './receipt-list.component.html',
  styleUrl: './receipt-list.component.scss'
})
export class ReceiptListComponent implements OnInit {
  private readonly receiptService = inject(ReceiptService);
  private readonly syncService = inject(SyncService);
  readonly connectivity = inject(ConnectivityService);

  readonly receipts = this.receiptService.receipts;
  readonly isLoading = this.receiptService.isLoading;
  readonly error = this.receiptService.error;
  readonly syncState = this.syncService.syncState;

  ngOnInit(): void {
    this.loadReceipts();
  }

  async loadReceipts(): Promise<void> {
    await this.receiptService.loadReceipts();
  }

  async refresh(): Promise<void> {
    await this.syncService.syncAll();
    await this.loadReceipts();
  }

  getReceiptImage(receipt: Receipt): string {
    return receipt.localImageData || receipt.blobUrl || '/assets/icons/receipt-placeholder.svg';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString();
  }

  formatAmount(amount: number | undefined, currency: string): string {
    if (amount === undefined) return 'No amount';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }

  getStatusClass(receipt: Receipt): string {
    if (receipt.syncStatus === 'pending_sync') return 'status-pending';
    if (receipt.ocrStatus === 'processing') return 'status-processing';
    if (receipt.ocrStatus === 'failed') return 'status-failed';
    return 'status-synced';
  }

  getStatusText(receipt: Receipt): string {
    if (receipt.syncStatus === 'pending_sync') return 'Pending sync';
    if (receipt.ocrStatus === 'processing') return 'Processing OCR';
    if (receipt.ocrStatus === 'failed') return 'OCR failed';
    return 'Synced';
  }

  async deleteReceipt(id: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this receipt?')) {
      await this.receiptService.deleteReceipt(id);
    }
  }
}
