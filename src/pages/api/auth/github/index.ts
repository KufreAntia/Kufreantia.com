import type { APIRoute } from 'astro';
import {
  OAUTH_CALLBACK_URL,
  OAUTH_SCOPE,
  SITE_HOST,
  createState,
  credentials,
  stateCookie,
  validateRequestOrigin,
} from '../../../../lib/github-oauth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const invalidOrigin = validateRequestOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');
  const siteId = url.searchParams.get('site_id');

  if (provider && provider !== 'github') {
    return jsonError('Unsupported OAuth provider.', 400);
  }
  if (siteId && siteId !== SITE_HOST) {
    return jsonError('The requested site is not authorized to use this OAuth endpoint.', 403);
  }

  const oauthCredentials = credentials();
  if (!oauthCredentials) return jsonError('OAuth environment variables are not configured.', 500);

  const state = createState();
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', oauthCredentials.clientId);
  authorizeUrl.searchParams.set('redirect_uri', OAUTH_CALLBACK_URL);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPE);
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': stateCookie(state),
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
