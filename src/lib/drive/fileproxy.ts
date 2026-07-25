import { getAuthClient } from '@/lib/google';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function proxyDriveFile(fileId: string): Promise<{ webStream: ReadableStream; mimeType: string; name: string }> {
  const auth = getAuthClient();
  const drive = google.drive({ version: 'v3', auth: auth as never });

  // 1. Fetch file metadata to get exact mimeType
  const metaRes = await drive.files.get({
    fileId,
    fields: 'mimeType, name',
  });

  const mimeType = metaRes.data.mimeType || 'application/octet-stream';
  const name = metaRes.data.name || 'document';

  // 2. Fetch media stream using Service Account credentials
  const mediaRes = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const nodeStream = mediaRes.data as unknown as Readable;
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return { webStream, mimeType, name };
}
