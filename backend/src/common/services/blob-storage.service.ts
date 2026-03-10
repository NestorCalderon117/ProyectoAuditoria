import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

@Injectable()
export class BlobStorageService {
  private readonly accountName: string;
  private readonly containerName =
    process.env.AZURE_CONTAINER_NAME ?? 'medical-images';
  private readonly storageKey: string;
  private readonly connectionString = process.env.AZURE_CONNECTION_STRING ?? '';
  private readonly sasExpiryMinutes = Number(
    process.env.SAS_TOKEN_EXPIRY_MINUTES ?? '15',
  );

  private readonly blobServiceClient: BlobServiceClient;

  constructor() {
    const accountNameFromConnection =
      this.getConnectionStringValue('AccountName');
    const accountKeyFromConnection =
      this.getConnectionStringValue('AccountKey');

    this.accountName =
      process.env.AZURE_STORAGE_ACCOUNT ??
      accountNameFromConnection ??
      'imageneshealthtech2026';
    this.storageKey =
      process.env.AZURE_STORAGE_KEY ?? accountKeyFromConnection ?? '';

    if (this.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        this.connectionString,
      );
      return;
    }

    if (!this.storageKey) {
      throw new InternalServerErrorException(
        'Azure Blob credentials are not configured.',
      );
    }

    const conn =
      'DefaultEndpointsProtocol=https;' +
      `AccountName=${this.accountName};` +
      `AccountKey=${this.storageKey};` +
      'EndpointSuffix=core.windows.net';
    this.blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  }

  private getConnectionStringValue(key: string): string | null {
    if (!this.connectionString) return null;
    const prefix = `${key}=`;
    const part = this.connectionString
      .split(';')
      .find((segment) => segment.startsWith(prefix));
    if (!part) return null;
    return part.slice(prefix.length);
  }

  async ensureContainerExists() {
    const container = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    await container.createIfNotExists();
  }

  async uploadBuffer(
    blobName: string,
    fileBuffer: Buffer,
    contentType?: string,
  ) {
    await this.ensureContainerExists();
    const container = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blobClient = container.getBlockBlobClient(blobName);
    await blobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: contentType
        ? { blobContentType: contentType }
        : undefined,
    });
  }

  async deleteBlobIfExists(blobName: string) {
    const container = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    await container.getBlockBlobClient(blobName).deleteIfExists();
  }

  getReadSasUrl(blobName: string) {
    if (!this.storageKey) {
      throw new InternalServerErrorException(
        'AZURE_STORAGE_KEY is required to generate SAS URLs.',
      );
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.storageKey,
    );
    const startsOn = new Date(Date.now() - 60 * 1000);
    const expiresOn = new Date(Date.now() + this.sasExpiryMinutes * 60 * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();

    return {
      url: `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}?${sas}`,
      expiresInMinutes: this.sasExpiryMinutes,
    };
  }
}
