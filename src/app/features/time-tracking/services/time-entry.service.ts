import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ApiService, ConnectivityService, OfflineStorageService, SyncService } from '../../../core/services';
import { AuthService } from '../../../core/auth';
import { TimeEntry, TimeEntryCreateRequest, TimeEntryUpdateRequest } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class TimeEntryService {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly syncService = inject(SyncService);
  private readonly authService = inject(AuthService);

  readonly timeEntries = signal<TimeEntry[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async loadTimeEntries(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const localEntries = await this.offlineStorage.getTimeEntries(userId);
      this.timeEntries.set(this.sortByDate(localEntries));

      if (this.connectivity.isOnline()) {
        await this.syncService.syncAll();
        const updatedEntries = await this.offlineStorage.getTimeEntries(userId);
        this.timeEntries.set(this.sortByDate(updatedEntries));
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load time entries');
    } finally {
      this.isLoading.set(false);
    }
  }

  private sortByDate(entries: TimeEntry[]): TimeEntry[] {
    return [...entries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async createTimeEntry(data: TimeEntryCreateRequest): Promise<TimeEntry | null> {
    const userId = this.authService.getUserId();
    if (!userId) return null;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const now = new Date();
      const localId = `local-${uuidv4()}`;

      const entry: TimeEntry = {
        id: localId,
        userId,
        date: data.date,
        hours: data.hours,
        description: data.description,
        project: data.project,
        syncStatus: 'pending_sync',
        isDeleted: false,
        createdAt: now,
        updatedAt: now
      };

      await this.offlineStorage.saveTimeEntry(entry);
      this.timeEntries.update(list => this.sortByDate([...list, entry]));

      if (this.connectivity.isOnline()) {
        try {
          const serverEntry = await firstValueFrom(this.api.createTimeEntry(data));
          await this.offlineStorage.updateTimeEntryId(localId, serverEntry.id);
          this.timeEntries.update(list =>
            this.sortByDate(list.map(e => e.id === localId ? { ...serverEntry, syncStatus: 'synced' as const } : e))
          );
          return serverEntry;
        } catch {
          // Entry stays in pending_sync state
        }
      }

      return entry;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to create time entry');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateTimeEntry(id: string, updates: TimeEntryUpdateRequest): Promise<TimeEntry | null> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const existing = await this.offlineStorage.getTimeEntry(id);
      if (!existing) {
        throw new Error('Time entry not found');
      }

      const updated: TimeEntry = {
        ...existing,
        ...updates,
        date: updates.date ?? existing.date,
        hours: updates.hours ?? existing.hours,
        description: updates.description ?? existing.description,
        project: updates.project ?? existing.project,
        syncStatus: 'pending_sync',
        updatedAt: new Date()
      };

      await this.offlineStorage.saveTimeEntry(updated);
      this.timeEntries.update(list => this.sortByDate(list.map(e => e.id === id ? updated : e)));

      if (this.connectivity.isOnline() && !id.startsWith('local-')) {
        try {
          const serverEntry = await firstValueFrom(this.api.updateTimeEntry(id, updates));
          updated.syncStatus = 'synced';
          await this.offlineStorage.saveTimeEntry(updated);
          this.timeEntries.update(list =>
            this.sortByDate(list.map(e => e.id === id ? { ...serverEntry, syncStatus: 'synced' as const } : e))
          );
        } catch {
          // Stay in pending_sync state
        }
      }

      return updated;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to update time entry');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.offlineStorage.deleteTimeEntry(id);
      this.timeEntries.update(list => list.filter(e => e.id !== id));

      if (this.connectivity.isOnline() && !id.startsWith('local-')) {
        try {
          await firstValueFrom(this.api.deleteTimeEntry(id));
        } catch {
          // Deletion is marked locally, will sync later
        }
      }

      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to delete time entry');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  getTimeEntryById(id: string): TimeEntry | undefined {
    return this.timeEntries().find(e => e.id === id);
  }

  getTotalHoursForPeriod(startDate: Date, endDate: Date): number {
    return this.timeEntries()
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .reduce((total, entry) => total + entry.hours, 0);
  }

  getEntriesGroupedByDate(): Map<string, TimeEntry[]> {
    const grouped = new Map<string, TimeEntry[]>();

    for (const entry of this.timeEntries()) {
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, entry]);
    }

    return grouped;
  }
}
