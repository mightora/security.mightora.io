# Mightora Security Role Designer

An open-source, local-first Dataverse security role design and comparison tool.

## Current features

- Create, edit, clone and delete role models and table definitions.
- Edit eight Dataverse table privileges, with five access levels where applicable.
- Compare two roles and flag changed privilege depth.
- Basic advisory review rules for broad Read, Delete, Assign and Share privileges.
- Inspect available business-unit and assignment metadata.
- Import and export versioned Mightora Security Model JSON, and export privilege CSV.
- A synthetic Claims Handling demonstration model.
- Browser-local autosave. No model data is transmitted by the application.

## Run and build

The online application is static: serve the project root using any local web server, or publish `dist/` via GitHub Pages.

```bash
npm ci
npm run check
```

The build creates `dist/index.html` and `dist/security-role-designer-offline.html`. The standalone offline file can be opened directly from disk. Online pages fetch Mightora UI assets from external hosts; the offline edition does not.

## Import schema

Only version `1.0.0` of `mightora.security` JSON is accepted. Models must contain valid `roles` and `tables`. Unknown versions and invalid privilege depths are rejected. Import size is limited to 8 MB. Current exports do not include actual user record access.

## Known limitations

- Direct Dataverse solution ZIP/XML import and live connections are **not yet implemented**.
- Security role modelling covers **table privileges**, not the complete set of miscellaneous or privacy-related privileges.
- The security map is a structured summary, not yet a graph editor.
- Advisory findings are not vulnerability certifications or authoritative effective-access checks.
- Word, PowerPoint, SVG and PDF exports are planned, not yet supported.
- The standalone offline build uses a self-contained typographic Mightora masthead instead of the official remote logo asset; official shared web components are not bundled offline yet.
- Production releases should pin, vendor and review shared UI dependencies rather than load mutable `@main` assets.

## Privacy and security

The application operates on browser-side model data and stores an autosave in localStorage. Use JSON export for independent backups. There is no server-side collection of imported security data. The online edition requests shared Mightora assets; the offline edition has a restrictive CSP and no permitted network connections. Inspect requests using the browser Developer Tools Network panel.

## Deployment

The `CNAME` file configures the intended custom domain (`security.mightora.io`) in the published static output. Publish the repository through **GitHub Actions** in repository Pages settings; use a DNS CNAME pointing at `mightora.github.io` with DNS-only Cloudflare mode until HTTPS activation is confirmed.

## Licence

MIT — see [LICENSE](LICENSE).
