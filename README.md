# UI Reference Library

A free GitHub-native Pinterest capture flow for keeping UI references close to your builds. It stores web-sized thumbnails, not full-resolution originals.

## Setup

Create a **Save Pinterest pin** issue. The Action calls Pinterest's official public oEmbed endpoint, downloads the largest thumbnail it can request, extracts a palette for images, appends data/library.json, comments on the issue, and closes it.

In Settings → Actions → General, allow workflow write permissions if required. The built-in GITHUB_TOKEN is used. If policy prevents it, add a fine-grained token as UI_LIBRARY_TOKEN with Contents read/write and Issues read/write for this repository.

## Phone shortcut

1. Create an iOS Shortcut with **Receive What’s On Screen From Share Sheet**, enable **Show in Share Sheet**.
2. Add **Get URLs from Shortcut Input**.
3. Add a Text action: `### pin_url\n[URL]\n\n### tags\n\n### note\nShared from Pinterest.` using the URL output.
4. Add **Get Contents of URL**: POST `https://api.github.com/repos/Habuskid/ui-templates/issues`, JSON body `{"title":"Save pin: [URL]","body":"[Text output]"}`.
5. Headers: Accept `application/vnd.github+json`, X-GitHub-Api-Version `2022-11-28`, User-Agent `ui-reference-shortcut`, Authorization `Bearer YOUR_FINE_GRAINED_TOKEN`.
6. Create a fine-grained token limited to this repository with Issues read/write only. Treat it like a password.

## Gallery

Run `npm install`, then `npx serve .` and open `/gallery/`. Python also works: `python -m http.server 8080`. GitHub Pages can serve main and root at `https://habuskid.github.io/ui-templates/gallery/`. If private later, use the same local server; no gallery code changes are needed.

Video oEmbed often has no downloadable file. The Action checks permitted og:video/og:image metadata and keeps a thumbnail/embed fallback with media_incomplete when needed.