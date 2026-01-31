import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService, SyncService } from '../../../core/services';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (connectivity.isOffline()) {
      <div class="offline-banner">
        <span class="icon">📡</span>
        <span class="message">You're offline. Changes will sync when you're back online.</span>
      </div>
    }

    @if (connectivity.isOnline() && syncService.syncState() === 'syncing') {
      <div class="syncing-banner">
        <span class="spinner"></span>
        <span class="message">Syncing changes...</span>
      </div>
    }

    @if (syncService.syncState() === 'error') {
      <div class="error-banner">
        <span class="icon">⚠️</span>
        <span class="message">{{ syncService.syncError() }}</span>
        <button class="retry-btn" (click)="retry()">Retry</button>
      </div>
    }
  `,
  styles: [`
    .offline-banner,
    .syncing-banner,
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .offline-banner {
      background: #fef3c7;
      color: #b45309;
    }

    .syncing-banner {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .error-banner {
      background: #fee2e2;
      color: #b91c1c;
    }

    .icon {
      flex-shrink: 0;
    }

    .message {
      flex: 1;
      text-align: center;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(29, 78, 216, 0.3);
      border-top-color: #1d4ed8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .retry-btn {
      padding: 0.25rem 0.75rem;
      background: white;
      border: 1px solid currentColor;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      color: inherit;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class OfflineIndicatorComponent {
  readonly connectivity = inject(ConnectivityService);
  readonly syncService = inject(SyncService);

  retry(): void {
    this.syncService.syncAll();
  }
}
