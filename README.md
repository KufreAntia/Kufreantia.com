# Antia.com

An Astro portfolio with Decap CMS content management.

## Run the website

```powershell
npm install
npm run dev
```

Open `http://localhost:4321`.

## Update content without code

Run these in two terminals:

```powershell
npm run dev
```

```powershell
npm run dev:cms
```

Then open `http://localhost:4321/admin/`. The CMS edits the JSON content records and uploaded media in this repository.

## Content structure

- `src/data/` contains homepage, biography, and global site settings.
- `src/content/projects/` contains project case studies.
- Other `src/content/` folders contain research, publications, speaking, awards, media, and gallery records.
- `src/pages/` contains reusable Astro route templates.
- `public/admin/config.yml` defines the CMS editing forms.

## Production CMS login

The CMS is configured with `git-gateway`. After the repository is pushed and the site is deployed, connect Git Gateway authentication on the chosen host. Local editing works through `npm run dev:cms` without production authentication.
