// Entry point - imports all function modules to register them with Azure Functions
import './receipts/index.js';
import './time-entries/index.js';
import './sync/index.js';
import './triggers/processReceiptOcr.js';
