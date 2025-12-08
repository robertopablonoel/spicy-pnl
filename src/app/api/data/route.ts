import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Simple token-based auth - set this in your Vercel env vars
const API_TOKEN = process.env.DATA_API_TOKEN || 'dev-token';

export async function GET(request: NextRequest) {
  // Check for auth token
  const token = request.headers.get('x-api-token');
  if (token !== API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file || !['all-txn', 'exclusions'].includes(file)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  try {
    const filePath = join(process.cwd(), 'private', `${file}.csv`);
    const content = readFileSync(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
