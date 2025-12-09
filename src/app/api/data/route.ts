import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, statSync, createReadStream } from 'fs';
import { join } from 'path';

// Simple token-based auth - set this in your Vercel env vars
const API_TOKEN = process.env.DATA_API_TOKEN || 'dev-token';

// File mapping
const FILES: Record<string, { path: string; contentType: string }> = {
  'all-txn': { path: 'all-txn.csv', contentType: 'text/csv' },
  'exclusions': { path: 'exclusions.csv', contentType: 'text/csv' },
  'video': { path: 'Brand Overview.mp4', contentType: 'video/mp4' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  // Check for auth token - either in header or query param (for video src)
  const headerToken = request.headers.get('x-api-token');
  const queryToken = searchParams.get('token');
  const token = headerToken || queryToken;

  if (token !== API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!file || !FILES[file]) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  const fileConfig = FILES[file];

  try {
    const filePath = join(process.cwd(), 'private', fileConfig.path);

    // For video files, handle range requests for streaming
    if (file === 'video') {
      const stat = statSync(filePath);
      const fileSize = stat.size;
      const range = request.headers.get('range');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const buffer = Buffer.alloc(chunkSize);
        const fd = require('fs').openSync(filePath, 'r');
        require('fs').readSync(fd, buffer, 0, chunkSize, start);
        require('fs').closeSync(fd);

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': fileConfig.contentType,
          },
        });
      } else {
        const content = readFileSync(filePath);
        return new NextResponse(content, {
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': fileConfig.contentType,
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }

    // For CSV files
    const content = readFileSync(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': fileConfig.contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
