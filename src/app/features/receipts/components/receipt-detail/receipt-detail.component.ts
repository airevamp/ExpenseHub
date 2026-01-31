import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';
import { Receipt } from '../../../../core/models';

@Component({
  selector: 'app-receipt-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './receipt-detail.component.html',
  styleUrl: './receipt-detail.component.scss'
})
export class ReceiptDetailComponent implements OnInit {
  private readonly receiptService = inject(ReceiptService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly receipt = signal<Receipt | null>(null);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.loadReceipt();
  }

  private loadReceipt(): void {
    const receipt = this.receiptService.getReceiptById(this.id());
    if (receipt) {
      this.receipt.set(receipt);
    }
    this.isLoading.set(false);
  }

  getReceiptImage(): string {
    const r = this.receipt();
    return r?.localImageData || r?.blobUrl || '/assets/icons/receipt-placeholder.svg';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatAmount(amount: number | undefined, currency: string): string {
    if (amount === undefined) return 'No amount';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }

  async deleteReceipt(): Promise<void> {
    if (confirm('Are you sure you want to delete this receipt?')) {
      await this.receiptService.deleteReceipt(this.id());
      this.router.navigate(['/receipts']);
    }
  }

  goBack(): void {
    this.router.navigate(['/receipts']);
  }
}
