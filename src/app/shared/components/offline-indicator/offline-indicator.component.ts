import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectivityService, SyncService } from '../../../core/services';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline-indicator.component.html',
  styleUrl: './offline-indicator.component.scss'
})
export class OfflineIndicatorComponent {
  readonly connectivity = inject(ConnectivityService);
  readonly syncService = inject(SyncService);

  retry(): void {
    this.syncService.syncAll();
  }
}
