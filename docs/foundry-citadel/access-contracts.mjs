const model = { apiName: "universal-llm-api", kind: "llm", label: "Model inference", endpointSecretName: "support-model-endpoint" };
const tool = { apiName: "orders-tool", kind: "tool", label: "MCP order lookup", endpointSecretName: "support-tool-endpoint" };
const agent = { apiName: "case-triage-agent", kind: "agent", label: "A2A specialist", endpointSecretName: "support-agent-endpoint" };

export const accessExamples = {
  inference: {
    title: "Model inference", code: "LLM", icon: "model", useCaseName: "AnswerAssistant",
    description: "Allow one model API, restrict its model alias, and budget consumption in tokens.",
    assets: [model], flow: "inference",
  },
  mcp: {
    title: "MCP tool", code: "TOOL", icon: "tool", useCaseName: "OrderLookup",
    description: "Grant a previously published MCP API. Limit gateway requests, not model tokens or individual business actions.",
    assets: [tool], flow: "mcp",
  },
  a2a: {
    title: "Agent-to-agent", code: "AGENT", icon: "agent", useCaseName: "CaseTriage",
    description: "Express an A2A entitlement and request limits. The native A2A path is preview: validate caller-key and product-policy enforcement before relying on it.",
    assets: [agent], flow: "a2a",
  },
  mixed: {
    title: "Mixed access", code: "MULTI", icon: "catalog", useCaseName: "SupportWorkspace",
    description: "Bundle a model API, MCP tool and A2A agent into one product and subscription. Apply different roles and limits to each asset type; validate A2A preview enforcement.",
    assets: [model, tool, agent], flow: "mcp",
  },
};

const roles = { llm: "Model.Invoke", tool: "MCP.Invoke", agent: "Agent.Invoke" };
const kinds = { llm: "LLM", tool: "MCP tool", agent: "A2A agent" };
const securityReference = "../modules/apim/policies/frag-security-handler.xml";

function parameterFile(example) {
  const apiNames = example.assets.map(asset => `'${asset.apiName}'`).join(", ");
  const endpoints = example.assets.map(asset => `      {
        apiName: '${asset.apiName}'
        endpointSecretName: '${asset.endpointSecretName}'
      }`).join("\n");
  return {
    id: "parameters", name: "main.bicepparam", language: "Bicep parameters", reference: "main.bicep",
    sections: [
      {
        id: "template", label: "Template", title: "Use the real onboarding module",
        description: "This is a Bicep parameter file, not ARM deployment JSON or an access-request form. Keep this file and the XML policy together under contracts/support/<use-case>/dev/ in the accelerator.",
        effect: "References the existing access-contract module. It does not contain or replace that module.",
        properties: [["using", "template reference", "Four parent directories lead from the example contract folder to citadel-access-contracts/main.bicep."]],
        code: "using '../../../../main.bicep'",
      },
      {
        id: "gateway", label: "apim", title: "Choose the gateway to configure",
        description: "All three coordinates identify an existing API Management instance. They are resource identifiers, not credentials.",
        effect: "The deployment adds the product, API associations and subscription to this gateway; it does not provision a new APIM instance.",
        properties: [
          ["subscriptionId", "string / required", "Azure subscription containing the gateway. The all-zero ID is a placeholder."],
          ["resourceGroupName", "string / required", "Existing APIM resource group."],
          ["name", "string / required", "Existing APIM service name, not its URL."],
        ],
        code: `param apim = {
  subscriptionId: '00000000-0000-0000-0000-000000000000'
  resourceGroupName: 'rg-citadel-example'
  name: 'apim-citadel-example'
}`,
      },
      {
        id: "identity", label: "useCase", title: "Name the consumer's entitlement",
        description: "These fields identify the consuming business unit, use case and environment. They are naming and attribution context, not an Entra identity or proof of permission.",
        effect: `Combined with services[].code, these values name ${example.productId} and its subscription.`,
        properties: [
          ["businessUnit", "string / required", "The consuming team. Separate use cases or environments should receive their own contracts."],
          ["useCaseName", "string / required", "A concise use-case name without spaces."],
          ["environment", "string / required", "Environment label; DEV here does not create an isolated network by itself."],
        ],
        code: `param useCase = {
  businessUnit: 'Support'
  useCaseName: '${example.useCaseName}'
  environment: 'DEV'
}`,
      },
      {
        id: "assets", label: "apiNameMapping", title: "Select already-published APIs",
        description: "The service code groups APIM API resource names. These are not backend URLs, model names or client endpoint paths. API names must exist and match the gateway.",
        effect: `Attaches ${example.assets.length} existing API${example.assets.length === 1 ? "" : "s"} to the ${example.code} product. No model backend, tool server or agent is created.`,
        properties: [
          [example.code, "array of API names / required", "The mapping key must equal the service's code."],
          ["API resource names", "string values", "universal-llm-api is an inference API. orders-tool and case-triage-agent are illustrative APIs that must be published first."],
        ],
        code: `param apiNameMapping = {
  ${example.code}: [${apiNames}]
}`,
      },
      {
        id: "services", label: "services[]", title: "Bind one product to policy and delivery",
        description: "Each services[] entry creates its own product and subscription. These examples deliberately use one entry, including the mixed contract: three assets do not require three keys.",
        effect: `Creates one product and one subscription. The selected subscription key is stored as ${example.keySecretName}; each asset gets an endpoint secret.`,
        properties: [
          ["code", "string / required", "Looks up the API bundle and supplies the product-name prefix: LLM, TOOL, AGENT or MULTI."],
          ["apiKeySecretName", "string / required", "Name of the Key Vault secret that will hold the active APIM subscription key, not the key itself."],
          ["assetEndpoints", "array / optional", "Explicit endpoint-secret plan. Each apiName must belong to this service's API mapping."],
          ["endpointSecretName", "string / optional", "Inside each asset entry, names its gateway endpoint secret. The top-level legacy field instead refers to the first granted API."],
          ["policyXml", "string / optional", "loadTextContent reads the adjacent XML file at compile time. Limits and JWT rules live in that file, not invented Bicep parameters."],
        ],
        code: `param services = [
  {
    code: '${example.code}'
    apiKeySecretName: '${example.keySecretName}'
    assetEndpoints: [
${endpoints}
    ]
    policyXml: loadTextContent('ai-product-policy.xml')
  }
]`,
      },
      {
        id: "delivery", label: "Key Vault", title: "Deliver references, not embedded secrets",
        description: "The module writes the generated active subscription key and the per-asset gateway URLs into an existing Key Vault. These sample files contain no actual credentials.",
        effect: `Writes one key secret and ${example.assets.length} endpoint secret${example.assets.length === 1 ? "" : "s"}. The application still needs permission to read the relevant secrets.`,
        properties: [
          ["useTargetAzureKeyVault", "boolean / optional", "true enables secret delivery. false uses deployment outputs instead; those outputs must be handled as sensitive."],
          ["keyVault", "object / required", "Existing vault coordinates. The module requires the object even when Key Vault delivery is disabled."],
        ],
        code: `param useTargetAzureKeyVault = true
param keyVault = {
  subscriptionId: '00000000-0000-0000-0000-000000000000'
  resourceGroupName: 'rg-citadel-example'
  name: 'kv-citadel-example'
}`,
      },
    ],
  };
}

function modelAccess(indent) {
  return [
    '<include-fragment fragment-id="set-llm-requested-model" />',
    '<set-variable name="allowedModels" value="gpt-4.1" />',
    '<include-fragment fragment-id="validate-model-access" />',
  ].map(line => indent + line).join("\n");
}

function tokenLimit(indent) {
  return `${indent}<llm-token-limit counter-key="@(context.Subscription.Id)"
${indent}                 tokens-per-minute="10000"
${indent}                 estimate-prompt-tokens="false"
${indent}                 token-quota="1000000"
${indent}                 token-quota-period="Monthly" />`;
}

function requestLimit(kind, indent) {
  const calls = kind === "tool" ? 60 : 30;
  const quota = kind === "tool" ? 10000 : 5000;
  return `${indent}<rate-limit-by-key calls="${calls}" renewal-period="60"
${indent}                   counter-key='@(context.Subscription.Id + ":${kind}")' />
${indent}<quota-by-key calls="${quota}" renewal-period="2592000"
${indent}              counter-key='@(context.Subscription.Id + ":${kind}")' />`;
}

function limitProperties(kind, mixed) {
  const role = [["requiredRoles", "string / opt-in", `Requires ${roles[kind]} on this asset's JWT. Comma-separated lists are any-of, not all-of; the mixed sample sets one role in each branch.`]];
  if (kind === "llm") {
    return [
      ...(mixed ? role : []),
      ["allowedModels", "comma-separated aliases", "Only the configured gpt-4.1 model alias is allowed. This is separate from the APIM API name."],
      ["tokens-per-minute", "integer / example: 10000", "Token-rate budget keyed by the APIM subscription, not a model deployment's Azure quota."],
      ["token-quota", "integer / example: 1000000", "Token quota for token-quota-period=Monthly. This is not a currency budget."],
      ["estimate-prompt-tokens", "boolean / example: false", "Uses the policy's configured token accounting rather than enabling prompt-token estimation."],
    ];
  }
  return [
    ...(mixed ? role : []),
    ["calls + renewal-period", `rate limit / ${kind === "tool" ? 60 : 30} per 60 seconds`, "Counts gateway requests. MCP initialization, discovery and tool calls can be separate requests."],
    ["quota-by-key", `call quota / ${kind === "tool" ? 10000 : 5000} per 2592000 seconds`, "2592000 seconds is a 30-day quota period, not the LLM policy's calendar-month setting."],
    ["counter-key", `subscription + :${kind}`, "Separates this asset type's counters within the shared contract. It does not create a new subscription."],
  ];
}

function policyFile(example) {
  const mixed = example.code === "MULTI";
  const assetKinds = [...new Set(example.assets.map(asset => asset.kind))];
  const sections = [
    {
      id: "inheritance", label: "Policy scope", title: "Preserve the gateway baseline",
      description: "This XML is a product policy, loaded through services[].policyXml. It relies on the accelerator's API-level baseline and pre-provisioned policy fragments.",
      effect: "Keeps inherited policies with <base />. This is not a standalone gateway security configuration.",
      properties: [["inbound", "APIM policy section", "Sets contract-specific rules. Backend, outbound and error sections retain their inherited policies."]],
      code: "<policies>\n  <inbound>\n    <base />",
    },
    {
      id: "authentication", label: "JWT & roles", title: "Require a token as well as the contract key",
      description: "All these examples opt into JWT authentication. The existing security-handler validates the configured issuer, audience, signature, expiry and required role. Provision the gateway's Entra/JWT support first.",
      effect: "A managed identity can obtain the caller's JWT, but it does not remove the contract subscription-key requirement. Backend authentication is a separate configuration.",
      properties: [
        ["jwtRequired", 'string / value: "true"', "The referenced security-handler reads a string. This is not the boolean expression @(true)."],
        ...(!mixed ? [["requiredRoles", "string / opt-in", `Requires ${roles[assetKinds[0]]}. Assign the app role directly to the calling application's or managed identity's service principal.`]] : []),
        ...(example.code === "AGENT" ? [["security-handler", "explicit fragment inclusion", "The A2A API baseline does not include this fragment. This sample includes it explicitly, but native key/product resolution must work first; this does not repair unsupported A2A preview gates."]] : []),
      ],
      reference: securityReference,
      code: '    <set-variable name="jwtRequired" value="true" />'
        + (!mixed ? `\n    <set-variable name="requiredRoles" value="${roles[assetKinds[0]]}" />` : "")
        + (example.code === "AGENT" ? '\n    <include-fragment fragment-id="security-handler" />' : ""),
    },
  ];
  if (example.code !== "LLM") {
    sections.push({
      id: "classification", label: "Asset types", title: "Classify API names before applying limits",
      description: "The fragment classifies the request from its APIM API resource name. List tool and agent APIs explicitly; anything unlisted defaults to LLM.",
      effect: "The mixed policy can use token controls for models and request controls for MCP/A2A without sending tool traffic through model-only policies.",
      properties: [
        ["contractToolApis", "comma-separated API names", "Must match the tool API names in apiNameMapping, not MCP tool-function names."],
        ["contractAgentApis", "comma-separated API names", "Must match the published A2A API names. A2A publication is preview."],
        ["set-asset-kind", "existing policy fragment", "Sets assetKind to llm, tool or agent for subsequent policy checks."],
      ],
      code: `    <set-variable name="contractToolApis" value="${example.assets.filter(asset => asset.kind === "tool").map(asset => asset.apiName).join(",")}" />
    <set-variable name="contractAgentApis" value="${example.assets.filter(asset => asset.kind === "agent").map(asset => asset.apiName).join(",")}" />
    <include-fragment fragment-id="set-asset-kind" />`,
    });
  }
  for (const [index, kind] of assetKinds.entries()) {
    const indent = mixed ? "        " : "    ";
    const body = kind === "llm" ? `${modelAccess(indent)}\n${tokenLimit(indent)}` : requestLimit(kind, indent);
    sections.push({
      id: `limits-${kind}`, label: `${kinds[kind]} limits`, title: `${kinds[kind]}: the right permission and unit`,
      description: kind === "llm"
        ? "Model entitlement and token capacity are separate checks. The alias must be onboarded by the platform; an access contract does not create capacity."
        : "Request limits protect the published endpoint. The tool or agent still enforces its own business permissions, data access and any required approvals.",
      effect: mixed
        ? `Only the ${kind} branch applies to this request. It requires ${roles[kind]} and uses the appropriate subscription-scoped counters.`
        : `Applies ${kind === "llm" ? "model allowlisting and token budgets" : "request-rate and call-quota controls"} to this contract's granted API.`,
      properties: [
        ...limitProperties(kind, mixed),
        ...(mixed && kind === "agent" ? [["security-handler", "explicit fragment inclusion", "The A2A baseline lacks caller JWT validation. Invoke it after setting Agent.Invoke, and validate native subscription/product resolution before using this preview path."]] : []),
      ],
      code: mixed
        ? `${index === 0 ? "    <choose>\n" : ""}      <when condition='@(context.Variables["assetKind"].ToString() == "${kind}")'>
        <set-variable name="requiredRoles" value="${roles[kind]}" />
${kind === "agent" ? '        <include-fragment fragment-id="security-handler" />\n' : ""}${body}
      </when>${index === assetKinds.length - 1 ? "\n    </choose>" : ""}`
        : body,
    });
  }
  return {
    id: "policy", name: "ai-product-policy.xml", language: "APIM product policy",
    reference: `policies/default-${example.code === "LLM" ? "ai" : "multi"}-product-policy.xml`,
    sections,
    ending: "  </inbound>\n  <backend><base /></backend>\n  <outbound><base /></outbound>\n  <on-error><base /></on-error>\n</policies>",
  };
}

export function getAccessExample(id) {
  if (!Object.hasOwn(accessExamples, id)) throw new RangeError(`Unknown access-contract scenario: ${id}`);
  const definition = accessExamples[id];
  const example = {
    ...definition,
    productId: `${definition.code}-Support-${definition.useCaseName}-DEV`,
    keySecretName: `support-${definition.useCaseName.toLowerCase()}-key`,
  };
  example.files = [parameterFile(example), policyFile(example)].map(file => ({
    ...file,
    text: [...file.sections.map(section => section.code), ...(file.ending ? [file.ending] : [])].join("\n\n") + "\n",
  }));
  return example;
}
