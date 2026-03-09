# jingguanchong.com

Static personal website for Jing Guan Chong.

## Structure

```text
.
├── CNAME
├── LICENSE
├── README.md
├── favicon.ico
├── index.html
└── assets
    ├── css
    │   └── main.css
    ├── js
    │   └── main.js
    └── img
        ├── illustrations
        │   └── world-map.png
        ├── logos
        │   ├── decathlon.png
        │   ├── global-alumni.png
        │   └── mit-professional-education.png
        └── portrait
            └── main_photo.jpg
```

## Conventions

- `index.html` stays at the repository root for GitHub Pages.
- All site assets live under `assets/`.
- Images are grouped by purpose: `portrait`, `logos`, and `illustrations`.
- Logo files use semantic names instead of template-derived names.
- The site remains plain static `HTML + CSS + JS` with no build step.

## Local check

Serve the repository root with any static server, for example:

```bash
python3 -m http.server 8000
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Deployment

- Hosting: GitHub Pages
- Public entrypoint: `index.html`
- Custom domain: `jingguanchong.com`
- `CNAME` must remain in the repository root

## License

This repository is published for deployment purposes only.
It is not released under an open-source license.
See `LICENSE` for reuse restrictions.
