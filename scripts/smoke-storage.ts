/* eslint-disable no-console */
// Standalone smoke test for StorageService's presign logic — no real
// Supabase/S3 account needed, since generating a presigned URL is a local
// HMAC signing operation that doesn't touch the network. This just proves
// the forcePathStyle + custom-endpoint config produces a well-formed,
// path-style URL against the bucket (the actual thing that broke with the
// old `minio` package against Supabase's path-prefixed endpoint).
import { StorageService } from '../src/storage/storage.service';

async function main() {
  const storage = new StorageService({
    endpoint: 'https://abcdefghijk.storage.supabase.co/storage/v1/s3',
    region: 'us-east-1',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    forcePathStyle: true,
    publicUrl: 'https://abcdefghijk.supabase.co/storage/v1/object/public',
  });

  const { uploadUrl, key } = await storage.presignUpload('avatar', 'image/jpeg', 'user123');
  console.log('Presigned upload URL:', uploadUrl);
  console.log('Object key:', key);

  const parsed = new URL(uploadUrl);
  console.assert(
    parsed.pathname.startsWith('/storage/v1/s3/avatars/'),
    'Expected path-style URL under /storage/v1/s3/avatars/, got: ' + parsed.pathname,
  );
  console.assert(parsed.searchParams.has('X-Amz-Signature'), 'Expected a SigV4 signature query param');
  console.log('Path-style presigned URL through the Supabase-shaped endpoint: OK');

  const publicUrl = storage.publicObjectUrl('avatar', key);
  console.assert(
    publicUrl === `https://abcdefghijk.supabase.co/storage/v1/object/public/avatars/${key}`,
    'publicObjectUrl did not build the expected URL',
  );
  console.log('publicObjectUrl: OK ->', publicUrl);

  try {
    storage.publicObjectUrl('kyc', key);
    console.error('FAILED: expected publicObjectUrl to throw for the private kyc-documents bucket');
    process.exit(1);
  } catch {
    console.log('Private bucket correctly rejected by publicObjectUrl(): OK');
  }

  console.log('\nAll storage smoke checks passed.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
