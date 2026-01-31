import { SyncStatus } from './receipt.model';

export interface TimeEntry {
  id: string;
  userId: string;
  date: Date;
  hours: number;
  description: string;
  project?: string;
  syncStatus: SyncStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryCreateRequest {
  date: Date;
  hours: number;
  description: string;
  project?: string;
}

export interface TimeEntryUpdateRequest {
  date?: Date;
  hours?: number;
  description?: string;
  project?: string;
}
