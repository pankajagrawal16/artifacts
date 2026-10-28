# Foundry IQ Solution Walkthrough

[Open the presentation](https://pankajagrawal16.github.io/artifacts/foundry-iq/).

A standalone, portal-style HTML walkthrough of the fictional Harbour Point
engineering-document PoC: ingestion, knowledge bases, dynamic agent-to-Excel
generation, measured chunk counts and customer acceptance criteria.

## Files

- `index.html`: published self-contained bundle, including Mermaid, icons and images.
- `source.html`: editable presentation source.
- `assets/`: four Foundry IQ images and non-sensitive provenance metadata.
- `build.py`: rebuilds the offline bundle; library downloads are cached locally.

The source images were selected from the user-provided Microsoft presentation
**The IQ Series: Foundry IQ**. No private OneDrive or SharePoint links are published.
Deployment resource names are illustrative; this is a solution walkthrough, not
an authenticated Foundry portal or a claim of exhaustive extraction accuracy.

Customer questions are hidden on startup. Enable **Show customer questions** in
**Presentation settings** to reveal the acceptance table. This is a presentation
visibility control, not access control; the published HTML contains that section.

## Rebuild

With Python, `requests` and `beautifulsoup4` installed:

```bash
python3 -m pip install --index-url https://packagefeedproxy.microsoft.io/pypi/simple requests beautifulsoup4
python3 docs/foundry-iq/build.py
```

The existing GitHub Pages workflow publishes `docs/` after a push to `main`.
Opening `index.html` locally also works without a server or external runtime assets.