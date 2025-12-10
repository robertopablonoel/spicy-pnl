import { NextRequest, NextResponse } from 'next/server';

// Simple token-based auth - set this in your Vercel env vars
const API_TOKEN = process.env.DATA_API_TOKEN || 'dev-token';

// Import CSV files as raw strings at build time
import allTxnCsv from '@/data/all-txn.csv';
import exclusionsCsv from '@/data/exclusions.csv';

const FILES: Record<string, { content: string; contentType: string }> = {
  'all-txn': { content: allTxnCsv, contentType: 'text/csv' },
  'exclusions': { content: exclusionsCsv, contentType: 'text/csv' },
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

  return new NextResponse(fileConfig.content, {
    headers: {
      'Content-Type': fileConfig.contentType,
    },
  });
}
