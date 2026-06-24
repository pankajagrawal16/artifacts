# artifacts

A growing collection of helpful utilities, scripts, and reference documentation for working with Azure.

## Contents

### `scripts/`

Standalone Python scripts for Azure operations. All scripts use [uv](https://docs.astral.sh/uv/) with PEP 723 inline metadata — no manual `pip install` required.

| Script | Description |
|---|---|
| `check_quota_tier.py` | Check the Azure AI Foundry quota tier for a subscription, look up per-model quota by region, and get guidance on requesting quota increases |

See [`scripts/README.md`](scripts/README.md) for usage details.

### `docs/`

Reference documentation and architecture guidance.

| Document | Description |
|---|---|
| `ingress-digest/` | Azure ingress architecture options with mapping to Azure Learn and Well-Architected guidance |

---

More utilities and docs will be added here over time.
