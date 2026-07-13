# Antia.com

An Astro portfolio with Decap CMS content management, deployed on Vercel at
`https://www.kufreusenantia.com`.

## Run the website

```powershell
npm install
npm run dev
```

Open `http://localhost:4321`.

## Update content without code

For local editing, run these commands in separate terminals:

```powershell
npm run dev
```

```powershell
npm run dev:cms
```

Then open `http://localhost:4321/admin/`. The CMS edits the JSON content records and uploaded media in this repository.

In production, open `https://www.kufreusenantia.com/admin/` and select **Login with GitHub**.

## Production CMS authentication

The admin interface is Decap CMS with a GitHub backend. Vercel hosts two server routes:

- OAuth start: `https://www.kufreusenantia.com/api/auth/github`
- OAuth callback: `https://www.kufreusenantia.com/api/auth/github/callback`

Create or update a GitHub OAuth App with:

- Homepage URL: `https://www.kufreusenantia.com`
- Authorization callback URL: `https://www.kufreusenantia.com/api/auth/github/callback`

Set these encrypted environment variables for the Vercel Production environment:

```text
DECAP_CLIENT_ID
DECAP_CLIENT_SECRET
```

Redeploy after changing environment variables. Never prefix the client secret with `PUBLIC_`; Astro would then expose it to browser code.

The OAuth endpoint accepts only the canonical production origin and the configured Decap site. It validates OAuth state with a secure, HTTP-only cookie and performs the access-token exchange on the server.

## GitHub and Vercel settings

- GitHub repository: `KufreAntia/Kufreantia.com`
- Production branch: `main`
- Canonical hostname: `www.kufreusenantia.com`
- Apex hostname: `kufreusenantia.com` (permanently redirected to the canonical hostname)

The GitHub user signing into Decap must have write access to the repository. The repository is private, so the OAuth flow requests GitHub's `repo` scope.

## Content structure

- `src/data/` contains homepage, CV, contact, and global site settings.
- `src/content/projects/` contains project case studies.
- Other `src/content/` folders contain research, publications, speaking, awards, media, and gallery records.
- `src/pages/` contains reusable Astro route templates and server endpoints.
- `public/admin/config.yml` defines the Decap CMS editing forms.
- `public/uploads/` contains CMS-managed media.
