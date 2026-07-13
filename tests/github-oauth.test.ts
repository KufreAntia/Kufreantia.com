import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as startOAuth } from '../src/pages/api/auth/github/index';
import { GET as finishOAuth } from '../src/pages/api/auth/github/callback';

const origin = 'https://www.kufreusenantia.com';

function invoke(
  route: typeof startOAuth,
  request: Request,
): ReturnType<typeof startOAuth> {
  return route({ request } as Parameters<typeof route>[0]);
}

describe('Decap GitHub OAuth', () => {
  beforeEach(() => {
    vi.stubEnv('DECAP_CLIENT_ID', 'test-client-id');
    vi.stubEnv('DECAP_CLIENT_SECRET', 'test-client-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('starts OAuth only for the configured Decap site', async () => {
    const request = new Request(
      `${origin}/api/auth/github?provider=github&site_id=www.kufreusenantia.com&scope=repo`,
    );
    const response = await invoke(startOAuth, request);
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(302);
    expect(location.origin).toBe('https://github.com');
    expect(location.pathname).toBe('/login/oauth/authorize');
    expect(location.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/github/callback`);
    expect(location.searchParams.get('scope')).toBe('repo');
    expect(location.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get('set-cookie')).toContain('__Host-decap_oauth_state=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Lax');
  });

  it('rejects a request made for another site', async () => {
    const request = new Request(`${origin}/api/auth/github?site_id=example.com`);
    const response = await invoke(startOAuth, request);

    expect(response.status).toBe(403);
  });

  it('rejects a callback with invalid OAuth state before token exchange', async () => {
    const exchange = vi.fn();
    vi.stubGlobal('fetch', exchange);
    const request = new Request(`${origin}/api/auth/github/callback?code=test-code&state=wrong`, {
      headers: { Cookie: '__Host-decap_oauth_state=expected' },
    });
    const response = await invoke(finishOAuth, request);

    expect(response.status).toBe(400);
    expect(exchange).not.toHaveBeenCalled();
  });

  it('exchanges a valid code server-side and returns the Decap handshake', async () => {
    const exchange = vi.fn(async () => new Response(JSON.stringify({ access_token: 'test-access-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', exchange);
    const state = 'a'.repeat(64);
    const request = new Request(`${origin}/api/auth/github/callback?code=test-code&state=${state}`, {
      headers: { Cookie: `__Host-decap_oauth_state=${state}` },
    });
    const response = await invoke(finishOAuth, request);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(exchange).toHaveBeenCalledOnce();
    expect(html).toContain('authorization:github:success:');
    expect(html).toContain(origin);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
