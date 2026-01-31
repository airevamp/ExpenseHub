import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import {
  AccountInfo,
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus
} from '@azure/msal-browser';
import { filter, Subject, takeUntil } from 'rxjs';
import { User } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);
  private readonly router = inject(Router);
  private readonly destroying$ = new Subject<void>();

  readonly isAuthenticated = signal(false);
  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(true);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Handle redirect callback
    this.msalService.handleRedirectObservable().subscribe({
      next: (result: AuthenticationResult | null) => {
        if (result) {
          this.setActiveAccount(result.account);
        }
        this.checkAndSetActiveAccount();
      },
      error: (error) => {
        console.error('Redirect error:', error);
        this.isLoading.set(false);
      }
    });

    // Listen for login/logout events
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) =>
          msg.eventType === EventType.LOGIN_SUCCESS ||
          msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
          msg.eventType === EventType.LOGOUT_SUCCESS
        ),
        takeUntil(this.destroying$)
      )
      .subscribe((result: EventMessage) => {
        if (result.eventType === EventType.LOGOUT_SUCCESS) {
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
        } else if (result.payload) {
          const payload = result.payload as AuthenticationResult;
          this.setActiveAccount(payload.account);
        }
      });

    // Monitor interaction status
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this.destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount();
        this.isLoading.set(false);
      });
  }

  private checkAndSetActiveAccount(): void {
    const activeAccount = this.msalService.instance.getActiveAccount();

    if (!activeAccount && this.msalService.instance.getAllAccounts().length > 0) {
      const accounts = this.msalService.instance.getAllAccounts();
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.updateUserFromAccount(accounts[0]);
    } else if (activeAccount) {
      this.updateUserFromAccount(activeAccount);
    }
  }

  private setActiveAccount(account: AccountInfo | null): void {
    if (account) {
      this.msalService.instance.setActiveAccount(account);
      this.updateUserFromAccount(account);
    }
  }

  private updateUserFromAccount(account: AccountInfo): void {
    this.isAuthenticated.set(true);
    this.currentUser.set({
      id: account.localAccountId,
      email: account.username,
      displayName: account.name || account.username
    });
  }

  login(): void {
    this.msalService.loginRedirect();
  }

  logout(): void {
    this.msalService.logoutRedirect({
      postLogoutRedirectUri: '/'
    });
  }

  getActiveAccount(): AccountInfo | null {
    return this.msalService.instance.getActiveAccount();
  }

  getUserId(): string | null {
    const account = this.getActiveAccount();
    return account?.localAccountId ?? null;
  }

  ngOnDestroy(): void {
    this.destroying$.next();
    this.destroying$.complete();
  }
}
