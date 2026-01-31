import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeEntryService } from '../../services/time-entry.service';
import { TimeEntryFormComponent } from '../time-entry-form/time-entry-form.component';
import { SyncService, ConnectivityService } from '../../../../core/services';
import { TimeEntry } from '../../../../core/models';

@Component({
  selector: 'app-time-entry-list',
  standalone: true,
  imports: [CommonModule, TimeEntryFormComponent],
  templateUrl: './time-entry-list.component.html',
  styleUrl: './time-entry-list.component.scss'
})
export class TimeEntryListComponent implements OnInit {
  private readonly timeEntryService = inject(TimeEntryService);
  private readonly syncService = inject(SyncService);
  readonly connectivity = inject(ConnectivityService);

  readonly timeEntries = this.timeEntryService.timeEntries;
  readonly isLoading = this.timeEntryService.isLoading;
  readonly error = this.timeEntryService.error;
  readonly syncState = this.syncService.syncState;

  readonly editingEntry = signal<TimeEntry | null>(null);
  readonly showForm = signal(true);

  ngOnInit(): void {
    this.loadEntries();
  }

  async loadEntries(): Promise<void> {
    await this.timeEntryService.loadTimeEntries();
  }

  async refresh(): Promise<void> {
    await this.syncService.syncAll();
    await this.loadEntries();
  }

  getGroupedEntries(): { date: string; entries: TimeEntry[]; totalHours: number }[] {
    const grouped = this.timeEntryService.getEntriesGroupedByDate();
    const result: { date: string; entries: TimeEntry[]; totalHours: number }[] = [];

    grouped.forEach((entries, date) => {
      result.push({
        date,
        entries,
        totalHours: entries.reduce((sum, e) => sum + e.hours, 0)
      });
    });

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }

  formatHours(hours: number): string {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  editEntry(entry: TimeEntry): void {
    this.editingEntry.set(entry);
    this.showForm.set(true);
  }

  onEntrySaved(entry: TimeEntry): void {
    this.editingEntry.set(null);
  }

  onEditCancelled(): void {
    this.editingEntry.set(null);
  }

  async deleteEntry(id: string, event: Event): Promise<void> {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this time entry?')) {
      await this.timeEntryService.deleteTimeEntry(id);
    }
  }

  getWeeklyTotal(): number {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.timeEntryService.getTotalHoursForPeriod(startOfWeek, today);
  }
}
