import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential
} from '@azure/storage-blob';

const connectionString = process.env.STORAGE_CONNECTION_STRING || '';
const containerName = 'receipts';

let containerClient: ContainerClient | null = null;

export function getContainerClient(): ContainerClient {
  if (!containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

export async function ensureContainerExists(): Promise<void> {
  const client = getContainerClient();
  await client.createIfNotExists({ access: 'blob' });
}

export interface UploadUrlResult {
  uploadUrl: string;
  blobUrl: string;
  blobName: string;
  expiresAt: Date;
}

export function generateUploadUrl(userId: string, fileName: string): UploadUrlResult {
  const blobName = `${userId}/${Date.now()}-${fileName}`;
  const container = getContainerClient();
  const blobClient = container.getBlobClient(blobName);

  // Parse connection string to get account name and key
  const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
  if (!matches) {
    throw new Error('Invalid storage connection string');
  }

  const accountName = matches[1];
  const accountKey = matches[2];
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('cw'), // create, write
    expiresOn: expiresAt
  }, sharedKeyCredential).toString();

  const uploadUrl = `${blobClient.url}?${sasToken}`;

  return {
    uploadUrl,
    blobUrl: blobClient.url,
    blobName,
    expiresAt
  };
}

export async function deleteBlob(blobName: string): Promise<void> {
  const container = getContainerClient();
  const blobClient = container.getBlobClient(blobName);
  await blobClient.deleteIfExists();
}

export async function getBlobUrl(blobName: string): Promise<string> {
  const container = getContainerClient();
  const blobClient = container.getBlobClient(blobName);
  return blobClient.url;
}
