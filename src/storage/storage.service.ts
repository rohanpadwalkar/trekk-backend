import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export type UploadPurpose = 'avatar' | 'trek' | 'post' | 'kyc' | 'chat';

const BUCKET_BY_PURPOSE: Record<UploadPurpose, string> = {
  avatar: 'avatars',
  trek: 'trek-images',
  post: 'post-images',
  chat: 'chat-attachments',
  kyc: 'kyc-documents',
};

/** Buckets that are configured public-read in the storage provider (see README for how to set this up per-provider). */
const PUBLIC_BUCKETS = new Set(['avatars', 'trek-images', 'post-images', 'chat-attachments']);

export interface StorageServiceOptions {
  endpoint: string; // full URL, e.g. https://<project_ref>.storage.supabase.co/storage/v1/s3
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicUrl: string; // base URL for reading public objects directly (provider-specific — see README)
}

/**
 * Generic S3-compatible storage client — works against Supabase Storage,
 * Cloudflare R2, self-hosted MinIO, or real AWS S3 by changing env vars only.
 *
 * We use the AWS SDK v3 rather than the `minio` package specifically because
 * Supabase's S3 endpoint has a path component
 * (https://<ref>.storage.supabase.co/storage/v1/s3) that the `minio` client
 * can't route through — AWS SDK v3 handles this correctly via
 * `forcePathStyle` + a full endpoint URL.
 *
 * Presigned direct-to-storage upload pattern is unchanged: the client asks
 * us for a presigned PUT URL, uploads bytes straight to the bucket, and only
 * ever sends us the resulting object key. This keeps binary uploads off the
 * Node process entirely.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly publicUrl: string;

  constructor(options: StorageServiceOptions) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      // Newer AWS SDK v3 versions default to attaching a CRC32 checksum
      // header/query-param to presigned PutObject URLs. The actual
      // uploader (a plain `fetch(url, { method: 'PUT', body })` from the
      // mobile app) won't send a matching header, which real AWS S3
      // tolerates but non-AWS S3-compatible providers (Supabase, R2,
      // MinIO) may reject as a signature mismatch. Opting into
      // WHEN_REQUIRED keeps checksums off unless something explicitly
      // asks for one, which is the behavior every provider here expects.
      requestChecksumCalculation: 'WHEN_REQUIRED',
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

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 5 * 60 });

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
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expirySeconds });
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
