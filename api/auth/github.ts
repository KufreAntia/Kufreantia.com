import { randomBytes, timingSafeEqual } from 'node:crypto';

const SITE_ORIGIN = 'https://www.kufreantia.com';
const CALLBACK_URL = `${SITE_ORIGIN}/api/auth/github`;
const STATE_COOKIE = 'decap_oauth_state';
const COOKIE_MAX_AGE = 10 * 60;

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get('cookie') ?? '';
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function popupResponse(status: 'success' | 'error', content: Record<string, string>, statusCode = 200): Response {
  const serialized = JSON.stringify(content)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  const message = `authorization:github:${status}:${serialized}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GitHub authorization</title>
    <style>body{font-family:system-ui,sans-serif;padding:2rem;color:#161713}p{max-width:38rem;line-height:1.6}</style>
  </head>
  <body>
    <p id="status">Completing GitHub authorization…</p>
    <script>
      (() => {
        const allowedOrigins = new Set(['https://www.kufreantia.com', 'https://kufreantia.com']);
        const status = document.querySelector('#status');

        if (!window.opener) {
          status.textContent = 'The CMS login window is no longer open. Return to the admin page and try again.';
          return;
        }

        const receiveMessage = (event) => {
          if (!allowedOrigins.has(event.origin)) return;
          window.opener.postMessage(${JSON.stringify(message)}, event.origin);
          window.removeEventListener('message', receiveMessage);
          status.textContent = ${JSON.stringify(status === 'success' ? 'Authorized. This window will close.' : 'Authorization failed. Return to the admin page and try again.')};
          if (${JSON.stringify(status)} === 'success') window.setTimeout(() => window.close(), 250);
        };

        window.addEventListener('message', receiveMessage);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
      'Set-Cookie': `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/github; Max-Age=0`,
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const clientId = process.env.DECAP_CLIENT_ID;
    const clientSecret = process.env.DECAP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return popupResponse('error', { message: 'OAuth environment variables are not configured.' }, 500);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const githubError = url.searchParams.get('error');

    if (githubError) {
      return popupResponse('error', {
        message: url.searchParams.get('error_description') ?? githubError,
      }, 400);
    }

    if (!code) {
      const state = randomBytes(32).toString('hex');
      const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
      authorizeUrl.searchParams.set('client_id', clientId);
      authorizeUrl.searchParams.set('redirect_uri', CALLBACK_URL);
      authorizeUrl.searchParams.set('scope', 'public_repo');
      authorizeUrl.searchParams.set('state', state);

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl.toString(),
          'Cache-Control': 'no-store',
          'Set-Cookie': `${STATE_COOKIE}=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/github; Max-Age=${COOKIE_MAX_AGE}`,
        },
      });
    }

    const storedState = readCookie(request, STATE_COOKIE);
    if (!returnedState || !storedState || !safeEqual(returnedState, storedState)) {
      return popupResponse('error', { message: 'Invalid or expired OAuth state. Please try again.' }, 400);
    }

    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: CALLBACK_URL,
        }),
      });

      const token = await tokenResponse.json() as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenResponse.ok || !token.access_token) {
        return popupResponse('error', {
          message: token.error_description ?? token.error ?? 'GitHub did not return an access token.',
        }, 400);
      }

      return popupResponse('success', { token: token.access_token, provider: 'github' });
    } catch {
      return popupResponse('error', { message: 'GitHub authentication could not be completed.' }, 502);
    }
  },
};
