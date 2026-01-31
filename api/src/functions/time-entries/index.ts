import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import {
  getTimeEntries,
  getTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  TimeEntryEntity,
  ensureTablesExist
} from '../../services/table.service.js';

// Helper to extract user ID from request
function getUserId(request: HttpRequest): string | null {
  const clientPrincipal = request.headers.get('x-ms-client-principal');
  if (clientPrincipal) {
    try {
      const decoded = JSON.parse(Buffer.from(clientPrincipal, 'base64').toString('utf8'));
      return decoded.userId || decoded.claims?.find((c: { typ: string; val: string }) => c.typ === 'sub')?.val;
    } catch {
      return null;
    }
  }
  return 'dev-user';
}

// GET /api/time-entries
async function listTimeEntries(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureTablesExist();
    const entries = await getTimeEntries(userId);
    return { jsonBody: entries };
  } catch (error) {
    context.error('Error listing time entries:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// GET /api/time-entries/{id}
async function getTimeEntryById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const entryId = request.params.id;
  if (!entryId) {
    return { status: 400, body: 'Entry ID is required' };
  }

  try {
    const entry = await getTimeEntry(userId, entryId);
    if (!entry) {
      return { status: 404, body: 'Time entry not found' };
    }
    return { jsonBody: entry };
  } catch (error) {
    context.error('Error getting time entry:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// POST /api/time-entries
async function createTimeEntryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    await ensureTablesExist();
    const body = await request.json() as Partial<TimeEntryEntity>;
    const entryId = uuidv4();
    const now = new Date();

    if (!body.Date || body.Hours === undefined) {
      return { status: 400, body: 'Date and Hours are required' };
    }

    const entry: TimeEntryEntity = {
      partitionKey: userId,
      rowKey: entryId,
      Date: new Date(body.Date),
      Hours: body.Hours,
      Description: body.Description || '',
      Project: body.Project,
      SyncStatus: 'synced',
      IsDeleted: false,
      CreatedAt: now,
      UpdatedAt: now
    };

    await createTimeEntry(entry);
    return { status: 201, jsonBody: entry };
  } catch (error) {
    context.error('Error creating time entry:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// PUT /api/time-entries/{id}
async function updateTimeEntryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const entryId = request.params.id;
  if (!entryId) {
    return { status: 400, body: 'Entry ID is required' };
  }

  try {
    const existing = await getTimeEntry(userId, entryId);
    if (!existing) {
      return { status: 404, body: 'Time entry not found' };
    }

    const body = await request.json() as Partial<TimeEntryEntity>;
    const updated: TimeEntryEntity = {
      ...existing,
      Date: body.Date ? new Date(body.Date) : existing.Date,
      Hours: body.Hours ?? existing.Hours,
      Description: body.Description ?? existing.Description,
      Project: body.Project ?? existing.Project,
      UpdatedAt: new Date()
    };

    await updateTimeEntry(updated);
    return { jsonBody: updated };
  } catch (error) {
    context.error('Error updating time entry:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// DELETE /api/time-entries/{id}
async function deleteTimeEntryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const userId = getUserId(request);
  if (!userId) {
    return { status: 401, body: 'Unauthorized' };
  }

  const entryId = request.params.id;
  if (!entryId) {
    return { status: 400, body: 'Entry ID is required' };
  }

  try {
    await deleteTimeEntry(userId, entryId);
    return { status: 204 };
  } catch (error) {
    context.error('Error deleting time entry:', error);
    return { status: 500, body: 'Internal server error' };
  }
}

// Register functions
app.http('time-entries-list', {
  methods: ['GET'],
  route: 'time-entries',
  authLevel: 'anonymous',
  handler: listTimeEntries
});

app.http('time-entries-get', {
  methods: ['GET'],
  route: 'time-entries/{id}',
  authLevel: 'anonymous',
  handler: getTimeEntryById
});

app.http('time-entries-create', {
  methods: ['POST'],
  route: 'time-entries',
  authLevel: 'anonymous',
  handler: createTimeEntryHandler
});

app.http('time-entries-update', {
  methods: ['PUT'],
  route: 'time-entries/{id}',
  authLevel: 'anonymous',
  handler: updateTimeEntryHandler
});

app.http('time-entries-delete', {
  methods: ['DELETE'],
  route: 'time-entries/{id}',
  authLevel: 'anonymous',
  handler: deleteTimeEntryHandler
});
