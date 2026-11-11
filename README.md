# artifacts

A growing collection of helpful utilities, scripts, and reference documentation for working with Azure.

[Browse all artifacts](https://pankaagr.cloud/artifacts/) for the published walkthroughs,
calculators and scripts.

## Contents

### `scripts/`

Standalone Python scripts for Azure operations. All scripts use [uv](https://docs.astral.sh/uv/) with PEP 723 inline metadata — no manual `pip install` required.

| Script | Description |
|---|---|
| `check_quota_tier.py` | Check the Azure AI Foundry quota tier for a subscription, look up per-model quota by region, and get guidance on requesting quota increases |
| `refresh_azure_openai_prices.mjs` | Generate the public USD Azure OpenAI retail-price snapshot used by the PTU workbook |

See [`scripts/README.md`](scripts/README.md) for usage details.

### `docs/`

Reference documentation and architecture guidance.

| Document | Description |
|---|---|
| [`foundry-citadel/`](docs/foundry-citadel/) | Foundry-style AI Citadel explorer with six animated traffic flows, annotated publish/access contracts, two network layouts and four-layer activation guidance |
| [`foundry-iq/`](docs/foundry-iq/) | Portal-style Foundry IQ walkthrough: PDF ingestion, knowledge bases, dynamic Excel generation, chunk counts and customer acceptance gates |
| [`foundry-snowflake/`](docs/foundry-snowflake/) | Interactive Microsoft Foundry + Snowflake MCP walkthrough, including PAT, native OAuth, and Entra OBO flows; images and diagram renderer are embedded |
| `ingress-digest/` | Azure ingress architecture options with mapping to Azure Learn and Well-Architected guidance |
| `ptu-estimate/` | Microsoft Foundry PTU architecture decision workbook and per-model capacity calculator |
| `real-time-quota/` | Azure quota sizing guidance for the `gpt-realtime` model |

The Foundry + Snowflake walkthrough uses example deployment identifiers, not live
tenant or account details. After GitHub Pages deployment, it is available at
[Foundry + Snowflake](https://pankajagrawal16.github.io/artifacts/foundry-snowflake/).

The [Foundry IQ presentation](https://pankajagrawal16.github.io/artifacts/foundry-iq/)
is self-contained, uses illustrative resource names and includes the relevant
Foundry IQ images without private sharing links.

The [AI Citadel explorer](https://pankajagrawal16.github.io/artifacts/foundry-citadel/)
is a static, dependency-free visual guide. It distinguishes runtime traffic,
control-plane configuration and asynchronous usage processing; playback speed is
illustrative, not measured latency. Serve `docs/` with any static HTTP server
(for example, `python3 -m http.server 8000 --directory docs`) and open
`/foundry-citadel/` to preview it locally. No presentation media, customer-specific
details or live Azure connections are included.

Its **Access contracts** workspace explains model-only, MCP, A2A and mixed-asset
examples using the accelerator's Bicep parameter and APIM product-policy XML
formats. Select a section to highlight its code and inspect its properties,
deployment effects, credential delivery and runtime checks. Samples contain
placeholders, not secrets, and require the referenced accelerator module and
configured resources before deployment; they do not deploy anything from the browser.

The companion **Publish contracts** workspace covers an existing MCP server,
REST-to-MCP operation wrapping and an A2A agent. It explains path construction,
backend credentials, source-key forwarding, optional API Center registration and
the handoff to an access contract. Publishing creates no consumer subscription.
The pinned A2A source has conflicting caller-key guidance: examples request
gating explicitly, include the missing caller security fragment in the agent
access policy, and flag preview behavior for environment-specific validation.

---

More utilities and docs will be added here over time.
