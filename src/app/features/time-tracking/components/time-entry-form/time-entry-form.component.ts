import { Component, inject, input, OnInit, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TimeEntryService } from '../../services/time-entry.service';
import { TimeEntry, TimeEntryCreateRequest } from '../../../../core/models';

@Component({
  selector: 'app-time-entry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './time-entry-form.component.html',
  styleUrl: './time-entry-form.component.scss'
})
export class TimeEntryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly timeEntryService = inject(TimeEntryService);

  readonly editEntry = input<TimeEntry | null>(null);
  readonly saved = output<TimeEntry>();
  readonly cancelled = output<void>();

  readonly isSaving = signal(false);

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    const entry = this.editEntry();
    if (entry) {
      this.form.patchValue({
        date: new Date(entry.date).toISOString().split('T')[0],
        hours: entry.hours,
        description: entry.description,
        project: entry.project || ''
      });
    }
  }

  private initForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      date: [today, Validators.required],
      hours: [null, [Validators.required, Validators.min(0.25), Validators.max(24)]],
      description: ['', Validators.required],
      project: ['']
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);

    const values = this.form.value;
    const data: TimeEntryCreateRequest = {
      date: new Date(values.date),
      hours: values.hours,
      description: values.description,
      project: values.project || undefined
    };

    let result: TimeEntry | null;

    const entry = this.editEntry();
    if (entry) {
      result = await this.timeEntryService.updateTimeEntry(entry.id, data);
    } else {
      result = await this.timeEntryService.createTimeEntry(data);
    }

    this.isSaving.set(false);

    if (result) {
      this.saved.emit(result);
      if (!entry) {
        this.form.reset({
          date: new Date().toISOString().split('T')[0],
          hours: null,
          description: '',
          project: ''
        });
      }
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  setQuickHours(hours: number): void {
    this.form.patchValue({ hours });
  }
}
