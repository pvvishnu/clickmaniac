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

## Deploy with custom domain (recommended: Cloudflare Pages)

1. Push this project to a GitHub repository.
2. Create a Cloudflare account and add your domain to Cloudflare DNS.
3. In Cloudflare Pages, click **Create a project** and connect your GitHub repo.
4. Build settings:
   - Framework preset: `None`
   - Build command: *(leave empty)*
   - Build output directory: `/`
5. Deploy.
6. In Pages project settings, open **Custom domains** and add your domain.
7. Follow Cloudflare DNS prompts to point your domain to Pages.

## Alternative hosts

- Netlify (also free with custom domains)
- GitHub Pages + your DNS provider

## Files

- `index.html`: page structure
- `styles.css`: design and layout
- `script.js`: gallery rendering/filter/lightbox
- `data/photos.json`: your image catalog
- `assets/images/`: store photo files
