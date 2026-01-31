import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Receipt,
  ReceiptCreateRequest,
  ReceiptUpdateRequest,
  UploadUrlResponse,
  TimeEntry,
  TimeEntryCreateRequest,
  TimeEntryUpdateRequest,
  BatchSyncRequest,
  BatchSyncResponse
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiConfig.baseUrl;

  // Receipts
  getReceipts(): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.baseUrl}/receipts`);
  }

  getReceipt(id: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.baseUrl}/receipts/${id}`);
  }

  createReceipt(receipt: ReceiptCreateRequest): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.baseUrl}/receipts`, receipt);
  }

  updateReceipt(id: string, receipt: ReceiptUpdateRequest): Observable<Receipt> {
    return this.http.put<Receipt>(`${this.baseUrl}/receipts/${id}`, receipt);
  }

  deleteReceipt(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/receipts/${id}`);
  }

  getUploadUrl(fileName: string): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(`${this.baseUrl}/receipts/upload-url`, { fileName });
  }

  uploadToBlob(uploadUrl: string, file: Blob): Observable<void> {
    return this.http.put<void>(uploadUrl, file, {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type
      }
    });
  }

  // Time Entries
  getTimeEntries(): Observable<TimeEntry[]> {
    return this.http.get<TimeEntry[]>(`${this.baseUrl}/time-entries`);
  }

  getTimeEntry(id: string): Observable<TimeEntry> {
    return this.http.get<TimeEntry>(`${this.baseUrl}/time-entries/${id}`);
  }

  createTimeEntry(entry: TimeEntryCreateRequest): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(`${this.baseUrl}/time-entries`, entry);
  }

  updateTimeEntry(id: string, entry: TimeEntryUpdateRequest): Observable<TimeEntry> {
    return this.http.put<TimeEntry>(`${this.baseUrl}/time-entries/${id}`, entry);
  }

  deleteTimeEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/time-entries/${id}`);
  }

  // Batch sync
  batchSync(request: BatchSyncRequest): Observable<BatchSyncResponse> {
    return this.http.post<BatchSyncResponse>(`${this.baseUrl}/sync`, request);
  }
}
