# artifacts

A growing collection of helpful utilities, scripts, and reference documentation for working with Azure.

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
| [`foundry-snowflake/`](docs/foundry-snowflake/) | Interactive Microsoft Foundry + Snowflake MCP walkthrough, including PAT, native OAuth, and Entra OBO flows; images and diagram renderer are embedded |
| `ingress-digest/` | Azure ingress architecture options with mapping to Azure Learn and Well-Architected guidance |
| `ptu-estimate/` | Microsoft Foundry PTU architecture decision workbook and per-model capacity calculator |
| `real-time-quota/` | Azure quota sizing guidance for the `gpt-realtime` model |

The Foundry + Snowflake walkthrough uses example deployment identifiers, not live
tenant or account details. After GitHub Pages deployment, it is available at
[Foundry + Snowflake](https://pankajagrawal16.github.io/artifacts/foundry-snowflake/).

---

More utilities and docs will be added here over time.
