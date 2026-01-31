import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReceiptService } from '../../../receipts/services/receipt.service';
import { TimeEntryService } from '../../../time-tracking/services/time-entry.service';
import { AuthService } from '../../../../core/auth';
import { ConnectivityService, SyncService } from '../../../../core/services';
import { Receipt, TimeEntry } from '../../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly receiptService = inject(ReceiptService);
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly authService = inject(AuthService);
  readonly connectivity = inject(ConnectivityService);
  readonly syncService = inject(SyncService);

  readonly currentUser = this.authService.currentUser;
  readonly isLoading = signal(true);

  readonly receipts = this.receiptService.receipts;
  readonly timeEntries = this.timeEntryService.timeEntries;

  readonly totalExpenses = computed(() => {
    return this.receipts().reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  });

  readonly weeklyHours = computed(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.timeEntries()
      .filter(e => new Date(e.date) >= startOfWeek)
      .reduce((sum, e) => sum + e.hours, 0);
  });

  readonly pendingReceipts = computed(() => {
    return this.receipts().filter(r => r.ocrStatus === 'pending' || r.ocrStatus === 'processing').length;
  });

  readonly recentReceipts = computed(() => {
    return [...this.receipts()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  readonly recentTimeEntries = computed(() => {
    return [...this.timeEntries()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.receiptService.loadReceipts(),
      this.timeEntryService.loadTimeEntries()
    ]);
    this.isLoading.set(false);
  }

  async refresh(): Promise<void> {
    this.isLoading.set(true);
    await this.syncService.syncAll();
    await Promise.all([
      this.receiptService.loadReceipts(),
      this.timeEntryService.loadTimeEntries()
    ]);
    this.isLoading.set(false);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
