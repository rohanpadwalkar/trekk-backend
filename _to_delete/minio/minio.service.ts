import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

export type UploadPurpose = 'avatar' | 'trek' | 'post' | 'kyc' | 'chat';

const BUCKET_BY_PURPOSE: Record<UploadPurpose, string> = {
  avatar: 'avatars',
  trek: 'trek-images',
  post: 'post-images',
  chat: 'chat-attachments',
  kyc: 'kyc-documents',
};

/** Buckets that serve objects directly over public-read HTTP (see docker-compose createbuckets init). */
const PUBLIC_BUCKETS = new Set(['avatars', 'trek-images', 'post-images', 'chat-attachments']);

interface MinioServiceOptions {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
}

/**
 * Presigned direct-to-object-storage upload pattern: the client asks us for
 * a presigned PUT URL, uploads the bytes straight to MinIO, and only ever
 * sends us the resulting object key. This matters for a production app
 * because proxying binary uploads through the Node process ties up a
 * request thread/memory per upload and doesn't scale as well as letting
 * object storage handle it directly.
 */
@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly publicUrl: string;

  constructor(options: MinioServiceOptions) {
    this.client = new Client({
      endPoint: options.endPoint,
      port: options.port,
      useSSL: options.useSSL,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
    });
    this.publicUrl = options.publicUrl.replace(/\/$/, '');
  }

  bucketFor(purpose: UploadPurpose): string {
    return BUCKET_BY_PURPOSE[purpose];
  }

  /** Returns { uploadUrl, key } — client PUTs the raw bytes to uploadUrl with the given contentType header. */
  async presignUpload(
    purpose: UploadPurpose,
    contentType: string,
    ownerId: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const bucket = this.bucketFor(purpose);
    const extension = extensionForContentType(contentType);
    const key = `${ownerId}/${randomUUID()}${extension}`;
    const expirySeconds = 5 * 60;
    const uploadUrl = await this.client.presignedPutObject(bucket, key, expirySeconds);
    return { uploadUrl, key };
  }

  /** Public URL for objects in a public-read bucket. Throws for private buckets (use signedGetUrl instead). */
  publicObjectUrl(purpose: UploadPurpose, key: string): string {
    const bucket = this.bucketFor(purpose);
    if (!PUBLIC_BUCKETS.has(bucket)) {
      throw new Error(`Bucket "${bucket}" is private — use signedGetUrl() instead of publicObjectUrl().`);
    }
    return `${this.publicUrl}/${bucket}/${key}`;
  }

  /** Short-lived signed GET URL — the only way to read from the private kyc-documents bucket. */
  async signedGetUrl(purpose: UploadPurpose, key: string, expirySeconds = 5 * 60): Promise<string> {
    const bucket = this.bucketFor(purpose);
    return this.client.presignedGetObject(bucket, key, expirySeconds);
  }
}

function extensionForContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'application/pdf': '.pdf',
  };
  return map[contentType] ?? '';
}
