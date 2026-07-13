import { randomBytes, timingSafeEqual } from 'node:crypto';

export const SITE_ORIGIN = 'https://www.kufreusenantia.com';
export const SITE_HOST = 'www.kufreusenantia.com';
export const OAUTH_START_PATH = '/api/auth/github';
export const OAUTH_CALLBACK_PATH = '/api/auth/github/callback';
export const OAUTH_CALLBACK_URL = `${SITE_ORIGIN}${OAUTH_CALLBACK_PATH}`;
export const OAUTH_SCOPE = 'repo';

const STATE_COOKIE = '__Host-decap_oauth_state';
const COOKIE_MAX_AGE = 10 * 60;

export function credentials(): { clientId: string; clientSecret: string } | undefined {
  const clientId = process.env.DECAP_CLIENT_ID;
  const clientSecret = process.env.DECAP_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

export function validateRequestOrigin(request: Request): Response | undefined {
  if (new URL(request.url).origin === SITE_ORIGIN) return undefined;

  return new Response(JSON.stringify({ error: 'This OAuth endpoint is only available on the canonical site.' }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function createState(): string {
  return randomBytes(32).toString('hex');
}

export function stateCookie(state: string): string {
  return `${STATE_COOKIE}=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function stateIsValid(request: Request, returnedState: string | null): boolean {
  const storedState = readCookie(request, STATE_COOKIE);
  if (!returnedState || !storedState) return false;

  const returnedBuffer = Buffer.from(returnedState);
  const storedBuffer = Buffer.from(storedState);
  return returnedBuffer.length === storedBuffer.length && timingSafeEqual(returnedBuffer, storedBuffer);
}

export function popupResponse(
  status: 'success' | 'error',
  content: Record<string, string>,
  statusCode = 200,
): Response {
  const serialized = JSON.stringify(content)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  const message = `authorization:github:${status}:${serialized}`;
  const nonce = randomBytes(16).toString('base64');
  const completionText = status === 'success'
    ? 'Authorized. This window will close.'
    : 'Authorization failed. Return to the admin page and try again.';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GitHub authorization</title>
    <style>body{font-family:system-ui,sans-serif;padding:2rem;color:#161713}p{max-width:38rem;line-height:1.6}</style>
  </head>
  <body>
    <p id="status">Completing GitHub authorization&hellip;</p>
    <script nonce="${nonce}">
      (() => {
        const siteOrigin = ${JSON.stringify(SITE_ORIGIN)};
        const statusElement = document.querySelector('#status');

        if (!window.opener) {
          statusElement.textContent = 'The CMS login window is no longer open. Return to the admin page and try again.';
          return;
        }

        const receiveMessage = (event) => {
          if (event.source !== window.opener || event.origin !== siteOrigin) return;
          window.opener.postMessage(${JSON.stringify(message)}, siteOrigin);
          window.removeEventListener('message', receiveMessage);
          statusElement.textContent = ${JSON.stringify(completionText)};
          if (${JSON.stringify(status)} === 'success') window.setTimeout(() => window.close(), 250);
        };

        window.addEventListener('message', receiveMessage);
        window.opener.postMessage('authorizing:github', siteOrigin);
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'`,
      'Referrer-Policy': 'no-referrer',
      'Set-Cookie': clearStateCookie(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies = request.headers.get('cookie') ?? '';
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
