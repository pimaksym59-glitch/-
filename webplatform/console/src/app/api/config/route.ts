/** Public runtime config endpoint (no secrets — §F7.4). */
import { NextResponse } from 'next/server';
import { getPublicConfig } from '@/shared/config/env';

export function GET(): NextResponse {
  return NextResponse.json(getPublicConfig());
}
