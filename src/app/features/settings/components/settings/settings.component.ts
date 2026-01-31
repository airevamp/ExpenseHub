import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth';
import { OfflineStorageService, SyncService } from '../../../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings">
      <header class="settings-header">
        <h1>Settings</h1>
      </header>

      <div class="settings-section">
        <h2>Account</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Email</label>
            <span>{{ authService.currentUser()?.email || 'Not signed in' }}</span>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Display Name</label>
            <span>{{ authService.currentUser()?.displayName || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Sync</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Last Sync</label>
            <span>{{ syncService.lastSyncTime() | date:'medium' || 'Never' }}</span>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Pending Changes</label>
            <span>{{ syncService.pendingChangesCount() }} items</span>
          </div>
          <button class="btn btn-secondary" (click)="forceSync()">
            Sync Now
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h2>Data</h2>
        <div class="setting-item danger">
          <div class="setting-info">
            <label>Clear Local Data</label>
            <span>Remove all locally stored data. Synced data will remain on the server.</span>
          </div>
          <button class="btn btn-danger" (click)="clearLocalData()">
            Clear Data
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h2>About</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Version</label>
            <span>1.0.0</span>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>ExpenseHub</label>
            <span>Business expense tracking with receipt OCR and time logging</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .settings-header {
      margin-bottom: 1.5rem;

      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
      }
    }

    .settings-section {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

      h2 {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
      }
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f3f4f6;

      &:last-child {
        border-bottom: none;
      }

      &.danger .setting-info span {
        color: #ef4444;
      }
    }

    .setting-info {
      label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 0.125rem;
      }

      span {
        font-size: 0.875rem;
        color: #6b7280;
      }
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;

      &:hover {
        background: #e5e7eb;
      }
    }

    .btn-danger {
      background: #fee2e2;
      color: #b91c1c;

      &:hover {
        background: #fecaca;
      }
    }
  `]
})
export class SettingsComponent {
  readonly authService = inject(AuthService);
  readonly syncService = inject(SyncService);
  private readonly offlineStorage = inject(OfflineStorageService);

  forceSync(): void {
    this.syncService.syncAll();
  }

  async clearLocalData(): Promise<void> {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      await this.offlineStorage.clearAllData();
      window.location.reload();
    }
  }
}
