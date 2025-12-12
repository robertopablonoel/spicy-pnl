import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Simple token-based auth - set this in your Vercel env vars
const API_TOKEN = process.env.DATA_API_TOKEN || 'dev-token';

const FILES: Record<string, { filename: string; contentType: string }> = {
  'all-txn': { filename: 'all-txn.csv', contentType: 'text/csv' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  // Check for auth token - either in header or query param
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
    // Read file at runtime from the data directory
    const filePath = path.join(process.cwd(), 'data', fileConfig.filename);
    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': fileConfig.contentType,
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
