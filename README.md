# ExpenseHub

A Progressive Web App (PWA) for expense management with receipt scanning and time tracking capabilities. Built with Angular 18 and Azure services, featuring offline-first architecture with automatic sync.

## Features

- **Receipt Management**: Capture receipts via camera or file upload with automatic OCR extraction using Azure Document Intelligence
- **Time Tracking**: Log and manage time entries for projects and tasks
- **Offline-First**: Full functionality offline with automatic background sync when connectivity returns
- **Dashboard**: Overview of expenses, receipts, and time entries
- **Authentication**: Secure login via Azure AD B2C
- **Performance Monitoring**: Built-in decorators for tracking async operation execution times

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular 18 PWA                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │  Receipts   │  │   Time Tracking     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Core Services                              ││
│  │  • OfflineStorageService (Dexie/IndexedDB)             ││
│  │  • SyncService (Background Sync)                       ││
│  │  • AuthService (MSAL)                                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Azure Static Web Apps                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Azure Functions (Node.js)                  ││
│  │  • /api/receipts - Receipt CRUD operations             ││
│  │  • /api/time-entries - Time entry management           ││
│  │  • /api/sync - Data synchronization                    ││
│  │  • Blob trigger for receipt processing                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Azure Services                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ Blob Storage │ │Table Storage │ │Document Intelligence ││
│  │  (Receipts)  │ │   (Data)     │ │      (OCR)           ││
│  └──────────────┘ └──────────────┘ └──────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐│
│  │                    Azure AD B2C                          ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Angular 18** - Component framework with standalone components
- **Angular PWA** - Service worker for offline support
- **Dexie.js** - IndexedDB wrapper for offline storage
- **MSAL Angular** - Microsoft Authentication Library
- **SCSS** - Styling with separate stylesheet files

### Backend
- **Azure Functions v4** - Serverless API (Node.js/TypeScript)
- **Azure Blob Storage** - Receipt image storage
- **Azure Table Storage** - Data persistence
- **Azure Document Intelligence** - Receipt OCR processing

### Infrastructure
- **Azure Static Web Apps** - Hosting with integrated Functions
- **Azure AD B2C** - Identity management

## Project Structure

```
ExpenseHub/
├── src/                          # Angular frontend
│   ├── app/
│   │   ├── core/                 # Core services, models, and utilities
│   │   │   ├── auth/             # Authentication (MSAL)
│   │   │   ├── decorators/       # TypeScript decorators (TrackTime)
│   │   │   ├── models/           # Data models
│   │   │   └── services/         # Core services (API, sync, offline)
│   │   ├── features/             # Feature modules
│   │   │   ├── dashboard/        # Dashboard view
│   │   │   ├── receipts/         # Receipt management (list, capture, edit)
│   │   │   ├── settings/         # App settings
│   │   │   └── time-tracking/    # Time entry management
│   │   ├── pages/                # Page components (login)
│   │   └── shared/               # Shared components (navbar, indicators)
│   ├── assets/                   # Static assets
│   └── environments/             # Environment configs
├── api/                          # Azure Functions backend
│   └── src/
│       ├── functions/            # API endpoints
│       │   ├── index.ts          # Entry point (registers all functions)
│       │   ├── receipts/         # Receipt API
│       │   ├── time-entries/     # Time entries API
│       │   ├── sync/             # Sync API
│       │   └── triggers/         # Blob triggers
│       └── services/             # Backend services
└── public/                       # PWA assets (icons, manifest)
```

## Prerequisites

- Node.js 18+
- npm 9+
- Angular CLI (`npm install -g @angular/cli`)
- Azure Functions Core Tools (`npm install -g azure-functions-core-tools@4`)
- Azure subscription (for backend services)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/ExpenseHub.git
cd ExpenseHub

# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..
```

### 2. Configure Environment

Create `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:7071/api',
  msalConfig: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'YOUR_B2C_AUTHORITY',
    redirectUri: 'http://localhost:4200'
  }
};
```

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "STORAGE_CONNECTION_STRING": "YOUR_STORAGE_CONNECTION_STRING",
    "DOCUMENT_INTELLIGENCE_ENDPOINT": "YOUR_ENDPOINT",
    "DOCUMENT_INTELLIGENCE_KEY": "YOUR_KEY"
  }
}
```

### 3. Run Development Server

```bash
# Terminal 1 - Frontend
npm start
# App runs at http://localhost:4200

# Terminal 2 - API
cd api && npm start
# API runs at http://localhost:7071
```

## Usage

### Receipt Capture
1. Navigate to **Receipts** from the dashboard
2. Click **Capture Receipt** to take a photo or upload an image
3. The receipt is processed automatically via OCR to extract vendor, date, and amount
4. Review and edit extracted data as needed

### Time Tracking
1. Navigate to **Time Tracking** from the dashboard
2. Click **Add Entry** to log time
3. Fill in project, description, and duration
4. Entries sync automatically when online

### Offline Mode
- The app works fully offline using IndexedDB storage
- Changes are queued and synced when connectivity returns
- The offline indicator shows current status

## Utilities

### TrackTime Decorator

Track execution time of async methods for performance monitoring:

```typescript
import { TrackTime } from '@app/core/decorators';

class MyService {
  @TrackTime()
  async fetchData() {
    // Logs: [✓] MyService.fetchData: 234.56ms
  }

  @TrackTime({ label: 'API Call', threshold: 100 })
  async callApi() {
    // Only logs if execution exceeds 100ms
  }

  @TrackTime({ callback: (data) => analytics.track(data) })
  async processReceipt() {
    // Sends timing data to custom callback
  }
}
```

**Options:**
- `label` - Custom label (defaults to ClassName.methodName)
- `logLevel` - 'log' | 'debug' | 'info' | 'warn' (default: 'debug')
- `threshold` - Only log if execution exceeds this ms value
- `callback` - Receive timing data for analytics/monitoring

## Deployment

Deploy to Azure Static Web Apps:

```bash
# Build the application
npm run build

# Deploy via Azure CLI or GitHub Actions
# See .github/ for CI/CD workflows
```

## License

MIT
