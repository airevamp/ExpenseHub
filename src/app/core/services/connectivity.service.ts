import { Injectable, signal, computed, NgZone, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private readonly ngZone = inject(NgZone);

  private readonly _isOnline = signal(navigator.onLine);

  readonly isOnline = this._isOnline.asReadonly();
  readonly isOffline = computed(() => !this._isOnline());

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this._isOnline.set(true);
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this._isOnline.set(false);
      });
    });
  }

  async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      this._isOnline.set(false);
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store'
      });
      const online = response.ok;
      this._isOnline.set(online);
      return online;
    } catch {
      // If fetch fails, check navigator.onLine as fallback
      const online = navigator.onLine;
      this._isOnline.set(online);
      return online;
    }
  }
}
