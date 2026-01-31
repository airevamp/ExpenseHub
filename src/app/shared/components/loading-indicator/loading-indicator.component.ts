import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingType = 'spinner' | 'skeleton' | 'overlay';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type()) {
      @case ('overlay') {
        <div class="loading-overlay">
          <div class="spinner-container">
            <div class="spinner-lg"></div>
            @if (message()) {
              <p class="loading-message">{{ message() }}</p>
            }
          </div>
        </div>
      }
      @case ('skeleton') {
        <div class="skeleton-container">
          @for (i of skeletonLines(); track i) {
            <div class="skeleton-line" [style.width]="getRandomWidth()"></div>
          }
        </div>
      }
      @default {
        <div class="spinner-inline">
          <div class="spinner"></div>
          @if (message()) {
            <span class="loading-message">{{ message() }}</span>
          }
        </div>
      }
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner-lg {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-inline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-message {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0;
    }

    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .skeleton-line {
      height: 1rem;
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: shimmer 1.5s infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class LoadingIndicatorComponent {
  readonly type = input<LoadingType>('spinner');
  readonly message = input<string>('');
  readonly lines = input(3);

  skeletonLines(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => i);
  }

  getRandomWidth(): string {
    const widths = ['100%', '85%', '70%', '90%', '75%'];
    return widths[Math.floor(Math.random() * widths.length)];
  }
}
