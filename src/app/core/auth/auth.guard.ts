import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const authGuard: CanActivateFn = () => {
  const msalService = inject(MsalService);
  const router = inject(Router);

  const account = msalService.instance.getActiveAccount();

  if (account) {
    return true;
  }

  // Check if there are any accounts at all
  const accounts = msalService.instance.getAllAccounts();
  if (accounts.length > 0) {
    msalService.instance.setActiveAccount(accounts[0]);
    return true;
  }

  // Not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};
