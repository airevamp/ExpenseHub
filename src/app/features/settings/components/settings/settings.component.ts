import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth';
import { OfflineStorageService, SyncService } from '../../../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
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
