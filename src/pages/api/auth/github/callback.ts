import type { APIRoute } from 'astro';
import {
  OAUTH_CALLBACK_URL,
  credentials,
  popupResponse,
  stateIsValid,
  validateRequestOrigin,
} from '../../../../lib/github-oauth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const invalidOrigin = validateRequestOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const oauthCredentials = credentials();
  if (!oauthCredentials) {
    return popupResponse('error', { message: 'OAuth environment variables are not configured.' }, 500);
  }

  const url = new URL(request.url);
  const githubError = url.searchParams.get('error');
  if (githubError) {
    return popupResponse('error', {
      message: url.searchParams.get('error_description') ?? githubError,
    }, 400);
  }

  const code = url.searchParams.get('code');
  if (!code) return popupResponse('error', { message: 'GitHub did not return an authorization code.' }, 400);
  if (!stateIsValid(request, url.searchParams.get('state'))) {
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
        client_id: oauthCredentials.clientId,
        client_secret: oauthCredentials.clientSecret,
        code,
        redirect_uri: OAUTH_CALLBACK_URL,
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
};
