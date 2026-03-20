# Photography Portfolio Website

A static portfolio site you can host for free and connect to your custom domain.

## How to add photos

1. Copy image files into `assets/images/`.
2. Open `data/photos.json`.
3. Add a new entry in `photos` using this format:

```json
{
  "title": "Photo title",
  "category": "Portrait",
  "location": "City, Country",
  "year": "2026",
  "src": "assets/images/your-file.jpg",
  "alt": "Short accessibility description"
}
```

## Run locally

Because browsers block `fetch` from local `file:///` pages, serve the folder locally:

### Option A: Python

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

### Option B: Node

```bash
npx serve .
```

## Deploy with custom domain (recommended: Netlify)

1. Push this project to a GitHub repository.
2. Sign in to Netlify and select **Add new site** > **Import an existing project**.
3. Connect your GitHub repo.
4. Build settings:
  - Base directory: *(leave empty)*
  - Build command: *(leave empty)*
  - Publish directory: `/`
5. Deploy.

### Connect clickmaniac.com to Netlify

1. In Netlify site settings, open **Domain management** and add `clickmaniac.com`.
2. Also add `www.clickmaniac.com` as a domain alias.
3. In your DNS provider for clickmaniac.com, create/update records:
  - `A` record for host `@` pointing to `75.2.60.5`
  - `A` record for host `@` pointing to `99.83.190.102`
  - `CNAME` record for host `www` pointing to your Netlify subdomain (example: `your-site-name.netlify.app`)
4. Back in Netlify, verify DNS and enable HTTPS certificate provisioning.
5. Set your primary domain to either `clickmaniac.com` or `www.clickmaniac.com` (your choice).

## Alternative hosts

- Cloudflare Pages
- GitHub Pages + your DNS provider

## Files

- `index.html`: page structure
- `styles.css`: design and layout
- `script.js`: gallery rendering/filter/lightbox
- `data/photos.json`: your image catalog
- `assets/images/`: store photo files
