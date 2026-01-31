import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';
import { AuthService } from './core/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, OfflineIndicatorComponent],
  template: `
    <div class="app-container">
      @if (authService.isAuthenticated()) {
        <app-navbar />
        <app-offline-indicator />
      }
      <main class="main-content" [class.authenticated]="authService.isAuthenticated()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-color, #f9fafb);
    }

    .main-content {
      flex: 1;

      &.authenticated {
        padding-bottom: env(safe-area-inset-bottom, 0);

        @media (max-width: 640px) {
          padding-bottom: calc(60px + env(safe-area-inset-bottom, 0));
        }
      }
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly msalService = inject(MsalService);
  readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.msalService.handleRedirectObservable().subscribe();
  }
}
