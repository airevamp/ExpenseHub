import { Routes } from '@angular/router';
import { authGuard } from './core/auth';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'receipts',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/receipts/components/receipt-list/receipt-list.component').then(m => m.ReceiptListComponent)
      },
      {
        path: 'capture',
        loadComponent: () => import('./features/receipts/components/receipt-capture/receipt-capture.component').then(m => m.ReceiptCaptureComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/receipts/components/receipt-detail/receipt-detail.component').then(m => m.ReceiptDetailComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/receipts/components/receipt-edit/receipt-edit.component').then(m => m.ReceiptEditComponent)
      }
    ]
  },
  {
    path: 'time',
    loadComponent: () => import('./features/time-tracking/components/time-entry-list/time-entry-list.component').then(m => m.TimeEntryListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/components/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
