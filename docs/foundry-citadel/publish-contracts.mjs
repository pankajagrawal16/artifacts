const foundryEndpoint = "https://foundry-citadel-example.services.ai.azure.com/api/projects/support/agents/case-triage/endpoint/protocols/a2a";
const gateway = "https://apim-citadel-example.azure-api.net";

export const publishExamples = {
  mcp: {
    title: "Existing MCP", code: "mcp-existing", icon: "tool",
    name: "orders-tool", path: "orders", accessExample: "mcp", flow: "mcp",
    description: "Expose an existing streamable MCP server through the gateway. Keep its backend credential separate from the caller's access-contract key.",
    warning: "",
  },
  api: {
    title: "REST API to MCP", code: "mcp-from-api", icon: "catalog",
    name: "orders-api-tool", path: "order-lookup", accessExample: "mcp", flow: "mcp",
    description: "Wrap selected operations of an already-onboarded REST API as MCP tools. This example opts into forwarding the same contract key to a protected source API.",
    warning: "Configure orders-api separately with subscriptionRequired=true and x-mcp-sub-key as its subscription-key header. The access contract must grant both orders-api-tool and orders-api. Test tools/call, not just initialize or tools/list; missing source authorization otherwise fails only on invocation.",
  },
  a2a: {
    title: "A2A agent", code: "a2a", icon: "agent",
    name: "case-triage-agent", path: "case-triage", accessExample: "a2a", flow: "a2a",
    description: "Expose an existing agent's A2A endpoint and agent card. The gateway authenticates to Foundry with its own managed identity; that does not authenticate the caller.",
    warning: "A2A is preview. The pinned source exposes subscriptionRequired but its sample and guide conflict on whether native caller-key validation works. This example requests true rather than anonymous access. Verify missing/invalid keys, product scope and JWT rejection in your environment; do not disable caller protection to work around a 401. The A2A baseline does not include security-handler.",
  },
};

function parameterFile(example) {
  const sections = [
    {
      id: "template", label: "Template", title: "One publishing file; inherited baseline policies",
      description: "Place this file under citadel-publish-contracts/contracts/order-assets/dev/. Unlike the access examples, publication needs no adjacent XML file unless you deliberately override the asset's baseline.",
      effect: "Invokes the existing subscription-scope publisher. A single publishAssets array can publish several assets; this example isolates one pattern.",
      properties: [["using", "template reference", "Three parent directories lead to the publisher's main.bicep. This differs from the four-level access-example folder layout."]],
      code: "using '../../../main.bicep'",
    },
    {
      id: "gateway", label: "Gateway & diagnostics", title: "Target existing platform resources",
      description: "The gateway, logger, shared security fragments and required network access must already be configured. This parameter file does not create the platform or the tool/agent workload.",
      effect: "Adds the asset API and its diagnostic settings to this APIM service. The usage fragments can be ensured by the publishing module.",
      properties: [
        ["apim", "object / required", "Existing gateway subscriptionId, resourceGroupName and name. The all-zero subscription ID is a placeholder."],
        ["appInsightsLoggerName", "string / optional", "An existing APIM Application Insights logger, not an instrumentation key."],
        ["ensureUsageFragments", "boolean / optional", "Creates the mcp-usage and a2a-usage policy fragments. It does not create the logger or usage-ingestion workflows."],
      ],
      code: `param apim = {
  subscriptionId: '00000000-0000-0000-0000-000000000000'
  resourceGroupName: 'rg-citadel-example'
  name: 'apim-citadel-example'
}
param appInsightsLoggerName = 'appinsights-logger'
param ensureUsageFragments = true`,
    },
    {
      id: "paths", label: "Path namespace", title: "API identity and client URL are different",
      description: "The module prefixes tool paths with mcp/ and agent paths with agent/. Only REST-to-MCP receives an additional /mcp suffix from APIM.",
      effect: `With the sample path, the client endpoint is ${example.endpoint}. The access contract instead refers to the API resource name ${example.name}.`,
      properties: [
        ["useAssetTypePathPrefix", "boolean / optional", "true enables the mcp/ or agent/ namespace. A per-asset pathPrefix can override it, including an empty string."],
        ...(example.code === "mcp-existing" ? [["configureCircuitBreaker", "boolean / optional", "Enables a native breaker on the remote MCP backend. A breaker stops repeated failures; it does not create failover capacity."]] : []),
      ],
      code: `param useAssetTypePathPrefix = true${example.code === "mcp-existing" ? "\nparam configureCircuitBreaker = true" : ""}`,
    },
  ];
  if (example.code === "a2a") {
    sections.push({
      id: "identity", label: "Backend identity", title: "Select APIM's identity, not the caller's",
      description: "Attach this user-assigned managed identity to APIM first and grant it the appropriate Foundry project role, such as Foundry Agent Consumer. Enable incoming A2A on the existing agent.",
      effect: "The A2A module injects authentication-managed-identity into its baseline policy. No caller permission is created by this identity selection.",
      properties: [["managedIdentityClientId", "string / optional", "UAMI application/client ID, not object ID. Empty selects APIM's system-assigned identity; that identity still needs backend authorization."]],
      reference: "modules/publishA2aAgent.bicep",
      code: "param managedIdentityClientId = '00000000-0000-0000-0000-000000000000'",
    });
  }
  if (example.code === "mcp-existing") {
    sections.push({
      id: "catalog-service", label: "API Center target", title: "Choose an optional discovery catalog",
      description: "This example opts into registration in an existing API Center. Both service coordinates and the per-asset publishToApiCenter flag are needed.",
      effect: "Enables a catalog registration for orders-tool. Discovery metadata does not proxy traffic, grant consent or authorize consumers.",
      properties: [
        ["apiCenter", "object / optional", "Existing subscriptionId, resourceGroupName, serviceName and workspaceName. Required when you opt an asset into registration."],
        ["serviceName", "string", "An empty serviceName disables registration even if an asset's flag is true."],
      ],
      reference: "modules/publishApiCenter.bicep",
      code: `param apiCenter = {
  subscriptionId: '00000000-0000-0000-0000-000000000000'
  resourceGroupName: 'rg-citadel-example'
  serviceName: 'apic-citadel-example'
  workspaceName: 'default'
}`,
    });
  }
  sections.push({
    id: "asset", label: "publishAssets[]", title: "Declare what is published",
    description: "name is the APIM API resource identifier that access contracts grant. path is a URL segment. displayName and description explain the asset to operators.",
    effect: `Publishes the ${example.code} API ${example.name}. No APIM product, subscription or consumer key is created.`,
    properties: [
      ["assetType", "string / required", "mcp-existing proxies a remote server; mcp-from-api wraps REST operations; a2a exposes an existing agent."],
      ["name / path", "strings / required", "Resource identity versus gateway route. Do not put an endpoint URL or model alias in an access contract's API-name mapping."],
      ["subscriptionRequired", "boolean / explicit opt-in", example.code === "a2a" ? "Requests caller-key gating instead of the module's anonymous A2A default. Native preview behavior must be validated; setting this flag is not proof of enforcement." : "Requires a subscription key on the published MCP API. An access contract supplies the consumer product and subscription."],
      ["subscriptionKeyHeaderName", "string / optional", "api-key matches these access examples. Ocp-Apim-Subscription-Key is also supported by the publisher."],
    ],
    code: `param publishAssets = [
  {
    assetType: '${example.code}'
    name: '${example.name}'
    displayName: '${example.title}'
    description: 'Support order assets published through the AI gateway.'
    path: '${example.path}'
    subscriptionRequired: true
    subscriptionKeyHeaderName: 'api-key'`,
  });
  if (example.code === "mcp-existing") {
    sections.push({
      id: "backend", label: "Remote MCP backend", title: "Keep backend secrets out of the contract",
      description: "The remote server must already implement the supported streamable MCP transport. APIM resolves its own backend credential from a Key Vault-backed named value.",
      effect: "Creates orders-tool-backend, a secret named-value reference and a native backend circuit breaker. It does not deploy an MCP server.",
      properties: [
        ["transportType", "string / optional", "streamable is the supported transport in this publisher."],
        ["backend.url", "string / required", "The remote MCP endpoint, not the gateway endpoint. Replace the reserved example.invalid host."],
        ["backend.authType", "string / optional", "api-key-header injects a backend key. managed-identity, api-key-bearer and none are also supported for remote MCP."],
        ["authConfig", "object", "headerName selects the backend's header; namedValueKey names the APIM secret reference; keyVaultSecretUri points to an existing secret. This is not the consumer subscription key."],
        ["circuitBreaker", "object / optional", "The default is 3 qualifying failures in PT5M, opening for PT1M and honoring Retry-After. Only remote MCP gets this backend resource."],
      ],
      reference: "modules/publishBackend.bicep",
      code: `    transportType: 'streamable'
    backend: {
      url: 'https://orders-mcp.example.invalid/mcp'
      authType: 'api-key-header'
      authConfig: {
        headerName: 'x-orders-backend-key'
        namedValueKey: 'orders-mcp-backend-key'
        keyVaultSecretUri: 'https://kv-citadel-example.vault.azure.net/secrets/orders-mcp-backend-key'
      }
    }`,
    });
  } else if (example.code === "mcp-from-api") {
    sections.push({
      id: "operations", label: "Operations & source key", title: "Expose only the intended REST operations",
      description: "The source API and operation IDs must already exist in APIM. This sample keeps the source API subscription-protected by forwarding the same contract key through a non-standard header.",
      effect: "Creates an MCP wrapper over get-order and get-shipping-status. The source API's backend and authentication are reused; no new backend resource is created.",
      properties: [
        ["sourceApiName", "string / required", "Existing APIM API resource name: orders-api, not its URL."],
        ["operationNames", "array / required", "Existing operation resource IDs/names on the source API, not display labels. Unlisted operations are not exposed as MCP tools."],
        ["forwardSubscriptionKeyToSource", "boolean / optional", "Opt-in forwarding. Requires the source API to read x-mcp-sub-key and the access contract to grant both wrapper and source."],
        ["sourceSubscriptionKeyHeaderName", "string / optional", "Must match the source API's custom key header. Standard subscription headers are stripped on the internal hop."],
      ],
      reference: "modules/publishMcpFromApi.bicep",
      code: `    sourceApiName: 'orders-api'
    operationNames: [ 'get-order', 'get-shipping-status' ]
    forwardSubscriptionKeyToSource: true
    sourceSubscriptionKeyHeaderName: 'x-mcp-sub-key'`,
    });
  } else {
    sections.push({
      id: "agent", label: "Agent card & transport", title: "Publish discovery and invocation together",
      description: "The agent card and JSON-RPC endpoint already exist in Foundry. The baseline rewrites the card's backend transport URLs to the gateway so clients do not bypass it.",
      effect: "Creates an A2A API, card route and managed-identity policy. It does not create a Foundry agent or an APIM backend object; there is no native backend circuit breaker.",
      properties: [
        ["agentId", "string / optional", "Logical agent identifier surfaced on the API. It does not create or assign an agent identity."],
        ["agentCardBackendUrl / agentCardPath", "strings", "Existing backend card versus its gateway discovery path. The sample uses the Foundry v1.0 card URL."],
        ["backend.url / jsonRpcPath", "strings", "Existing A2A JSON-RPC backend and relative path."],
        ["authConfig.resource", "string / optional", "https://ai.azure.com is the backend managed-identity audience, not the caller JWT audience."],
      ],
      reference: "modules/publishA2aAgent.bicep",
      code: `    agentId: 'case-triage'
    agentCardPath: '/.well-known/agent.json'
    agentCardBackendUrl: '${foundryEndpoint}/agentCard/v1.0'
    jsonRpcPath: '/'
    backend: {
      url: '${foundryEndpoint}'
      authType: 'managed-identity'
      authConfig: {
        resource: 'https://ai.azure.com'
      }
    }`,
    });
  }
  sections.push({
    id: "metadata", label: "Metadata", title: "Describe governance intent without implying enforcement",
    description: "These documented fields record authoring context. They are not RBAC grants, privacy controls or evidence of compliance.",
    effect: "Keeps version, owner and classification in the contract. The pinned orchestrator does not automatically copy this metadata object into API Center custom properties.",
    properties: [
      ["metadata", "object / optional", "Informational context. Use the separate apiCenter fields for registration metadata."],
      ["classification", "string", "An internal classification label is not a network boundary, DLP policy or automatic authorization rule."],
    ],
    reference: "publish-contract-guide.md",
    code: `    metadata: {
      version: '1.0.0'
      owner: 'Support platform'
      classification: 'internal'
    }`,
  });
  sections.push({
    id: "catalog", label: "Catalog registration", title: "Discoverability is an explicit opt-in",
    description: example.code === "mcp-existing"
      ? "Register this MCP asset with its gateway endpoint in the configured API Center. Validate the catalog environment and lifecycle settings."
      : "This example leaves API Center registration off. To enable it, supply global API Center coordinates and per-asset environment/version settings.",
    effect: example.code === "mcp-existing"
      ? "Requests a kind=mcp API Center entry and development version. It creates no consumer entitlement."
      : "Publishes the gateway API without a catalog entry. It still creates no consumer entitlement.",
    properties: [
      ["publishToApiCenter", "boolean / optional", "false by default. Registration also requires a non-empty global apiCenter.serviceName."],
      ["apiCenter.environmentName", "string / required when enabled", "Catalog environment associated with this asset, not the runtime's network environment."],
      ["lifecycleStage / versionName", "strings / optional", "Catalog lifecycle and version identifiers. These do not deploy an application version."],
    ],
    reference: "modules/publishApiCenter.bicep",
    code: example.code === "mcp-existing"
      ? `    publishToApiCenter: true
    apiCenter: {
      environmentName: 'mcp-dev'
      lifecycleStage: 'development'
      versionName: '1-0-0'
      versionDisplayName: '1.0.0'
    }`
      : "    publishToApiCenter: false",
  });
  const ending = "  }\n]";
  return {
    id: "parameters", name: "main.bicepparam", language: "Bicep parameters",
    reference: "main.bicep", sections, ending,
    text: [...sections.map(section => section.code), ending].join("\n\n") + "\n",
  };
}

export function getPublishExample(id) {
  if (!Object.hasOwn(publishExamples, id)) throw new RangeError(`Unknown publish-contract scenario: ${id}`);
  const definition = publishExamples[id];
  const prefix = definition.code === "a2a" ? "agent" : "mcp";
  const endpoint = `${gateway}/${prefix}/${definition.path}${definition.code === "mcp-from-api" ? "/mcp" : ""}`;
  const example = {
    ...definition, endpoint,
    agentCard: definition.code === "a2a" ? `${endpoint}/.well-known/agent.json` : "",
    accessApis: definition.code === "mcp-from-api" ? [definition.name, "orders-api"] : [definition.name],
    resources: [
      ["APIM API", definition.name],
      ["Backend", definition.code === "mcp-existing" ? `${definition.name}-backend` : definition.code === "a2a" ? "Policy-managed identity; no backend object" : "Reuses orders-api backend"],
      ["API Center", definition.code === "mcp-existing" ? "Opt-in mcp registration" : "Registration disabled"],
    ],
  };
  example.files = [parameterFile(example)];
  return example;
}
