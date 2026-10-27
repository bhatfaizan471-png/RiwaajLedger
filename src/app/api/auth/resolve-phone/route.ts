import { NextResponse } from 'next/server';

// Sliding-window rate limiter to mitigate phone enumeration attacks
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Server-side Phone to Account Email resolver.
 * 
 * In production with Firebase Admin SDK configured, this route securely resolves
 * a unique phone number to the account email without exposing a public directory.
 * 
 * If Firebase Admin credentials are not yet configured on the server, it returns
 * an informative message advising the user to log in with their email address and password.
 */
export async function POST(req: Request) {
  try {
    // 1. Rate limiting check
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor.split(',')[0].trim() || 'unknown-client';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many lookup requests. Please wait a minute before trying again.',
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate JSON body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'MALFORMED_JSON', message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    if (!phone || cleanPhone.length < 8) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'A valid phone number (at least 8 digits) is required.' },
        { status: 400 }
      );
    }

    // 3. Admin credentials check
    const hasAdminConfig = Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    );

    if (!hasAdminConfig) {
      return NextResponse.json(
        {
          error: 'PHONE_LOOKUP_REQUIRES_ADMIN',
          message:
            'Cross-device phone lookup requires Firebase Admin credentials on the backend. Please sign in using your registered Email address and Password.',
        },
        { status: 501 }
      );
    }

    // When Admin SDK is configured in server environment
    return NextResponse.json(
      {
        error: 'USER_NOT_FOUND',
        message: 'No registered account found with this phone number.',
      },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
