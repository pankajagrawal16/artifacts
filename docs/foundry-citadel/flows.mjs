const citadelRevision = "89d3d70b13aada1972d2e280e00e5aa49a85ad97";
const gatewayRevision = "81599b31dfbaee20ebd3a6d2ba9b07dde3c31814";
const citadel = `https://github.com/Azure-Samples/foundry-citadel-platform/blob/${citadelRevision}`;
const gateway = `https://github.com/Azure-Samples/ai-hub-gateway-solution-accelerator/blob/${gatewayRevision}`;

export const sources = {
  citadel: { title: "AI Citadel blueprint", publisher: "Azure Samples", url: `${citadel}/README.md`, description: "The four responsibility layers, shared trust model, hub-and-spoke execution and complementary observability views.", revision: citadelRevision },
  gateway: { title: "AI Hub Gateway accelerator", publisher: "Azure Samples", url: `${gateway}/README.md`, description: "The central runtime gateway, deployed components and the distinction between backend, publish and access contracts.", revision: gatewayRevision },
  network: { title: "Network architecture", publisher: "Gateway accelerator", url: `${gateway}/guides/network-approach.md`, description: "Both supported network patterns: Citadel in the enterprise network hub, or in a dedicated governance spoke.", revision: gatewayRevision },
  access: { title: "Access contracts", publisher: "Gateway accelerator", url: `${gateway}/bicep/infra/citadel-access-contracts/README.md`, description: "Per-use-case access, products, subscriptions, identity checks, limits, safety policies and credential delivery.", revision: gatewayRevision },
  backend: { title: "LLM backend onboarding", publisher: "Gateway accelerator", url: `${gateway}/bicep/infra/llm-backend-onboarding/README.md`, description: "Curated model supply, aliases, backend pools and configured capacity-routing behaviour.", revision: gatewayRevision },
  publish: { title: "Publish contracts (preview)", publisher: "Gateway accelerator", url: `${gateway}/bicep/infra/citadel-publish-contracts/README.md`, description: "Publish protected MCP tools and A2A agents. Publishing assets and granting consumer access are separate operations.", revision: gatewayRevision },
  observability: { title: "Platform observability", publisher: "Gateway accelerator", url: `${gateway}/guides/platform-observability-guide.md`, description: "APIM diagnostics, Application Insights, optional detailed LLM logging, and Event Hubs → Logic Apps → Cosmos DB → Power BI.", revision: gatewayRevision },
  learnGateway: { title: "AI gateway in API Management", publisher: "Microsoft Learn", url: "https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities", description: "Token limits, authentication, content safety, backend load balancing, circuit breakers, telemetry and service-tier caveats." },
  learnMcp: { title: "Govern MCP tools with an AI gateway", publisher: "Microsoft Learn · preview", url: "https://learn.microsoft.com/azure/foundry/agents/how-to/tools/governance", description: "Foundry portal routing eligibility, authentication, verification, limitations and the distinction between gateway logs and tool-level traces." },
};

export const networkModes = {
  dedicated: {
    label: "Dedicated governance spoke",
    arrival: "The agent calls the gateway endpoint. Its private route traverses the enterprise hub firewall before entering the separate Citadel governance spoke. The firewall enforces network rules; APIM enforces API and AI policy.",
    departure: "APIM returns the governed result over the network path: governance spoke → enterprise hub firewall → calling agent. The model endpoint is not exposed as the consumer's integration point.",
    route: "Agent spoke → hub firewall → Citadel spoke",
    ingress: ["agent-firewall", "firewall-gateway"],
  },
  hub: {
    label: "Inside the connectivity hub",
    arrival: "The agent calls the gateway in the existing enterprise connectivity hub over the spoke-to-hub connection. This layout does not add a separate governance-spoke ingress hop. API policy still executes at APIM.",
    departure: "APIM returns the governed result directly to the calling agent over the hub-to-spoke connection. Network placement changes; the agent's governed API contract does not.",
    route: "Agent spoke → Citadel gateway in the network hub",
    ingress: ["agent-gateway"],
  },
};

const prompt = {
  id: "prompt", title: "A user starts an agent run", short: "User → agent",
  description: "A person asks the application for help. The application starts a run in its business-unit agent environment. User-to-application authentication belongs to the application; the next model call is a separate, governed interaction.",
  paths: ["app-agent"], nodes: ["app", "agent"], kind: "request", packet: "User input",
  value: "The team owns its user experience and agent logic without having to operate its own enterprise-wide AI gateway.",
  details: [["Boundary", "Application → agent runtime"], ["Protocol", "Application API / agent SDK"]], source: "citadel",
};
const ingress = {
  id: "ingress", title: "Reach the governed entry point", short: "Agent → gateway",
  description: "The agent targets APIM rather than a raw provider endpoint.", networkArrival: true,
  paths: ["ingress"], nodes: ["agent", "gateway"], kind: "request", packet: "API request",
  value: "Central governance works because the relevant runtime connections actually point at the gateway, not because a registry entry exists.",
  details: [["Destination", "Configured APIM endpoint"], ["Transport", "HTTPS; routing and DNS configured"]], source: "network",
};
const entitlement = {
  id: "entitlement", title: "Prove identity. Check entitlement.", short: "Identity & access",
  description: "The gateway validates the configured consumer credentials and resolves the access contract. The example uses an APIM subscription plus an Entra-issued JWT. Policy checks permitted assets and limits before selecting a backend.",
  paths: [], nodes: ["gateway", "contracts"], kind: "policy", packet: "Policy check",
  value: "Each use case gets scoped access. Consumers do not need the raw model-provider credential.",
  details: [["Consumer", "Contract subscription + JWT in this example"], ["Backend", "Separate identity and RBAC configuration"]], source: "access",
};
const response = {
  id: "response", title: "Return through the same governed front door", short: "Gateway → agent",
  description: "The gateway returns the result to the calling agent.", networkDeparture: true,
  paths: ["egress"], nodes: ["gateway", "agent"], kind: "response", packet: "Response",
  value: "The client keeps one stable integration while the platform controls backend placement and policy.",
  details: [["Direction", "Gateway → calling agent"], ["Result", "Governed API response"]], source: "network",
};
const audit = {
  id: "audit", title: "Emit operational and usage signals", short: "Async evidence",
  description: "Gateway diagnostics feed Application Insights and configured logs. Separately, usage events are sent to Event Hubs for processing. These are asynchronous branches, not extra stops that the user's answer waits to traverse.",
  paths: ["gateway-metrics", "gateway-events"], parallel: true, nodes: ["gateway", "metrics", "events"], kind: "telemetry", packet: "Telemetry",
  value: "Platform operations and FinOps get a shared evidence trail, while full agent reasoning traces still require runtime instrumentation.",
  details: [["Diagnostics", "Request, dependency and token metrics"], ["Privacy", "Body capture is optional; govern retention"]], source: "observability",
};

export const scenarios = {
  inference: {
    title: "Governed inference", subtitle: "Follow a user request to an approved model and back.", icon: "model", outcome: "End to end",
    note: "The agent run and the model call are distinct. Gateway policies are configurable, not automatic guarantees. Moderation-service calls and token issuance are summarised; optional prompt/response capture must be explicitly governed.",
    steps: [
      prompt, ingress, entitlement,
      {
        id: "safety", title: "Apply configured guardrails", short: "Safety & limits",
        description: "Configured inbound policies can screen content, detect or anonymise PII, and enforce request or token limits. The canvas summarises this policy stage; calls to Content Safety or Language services are not expanded.",
        paths: [], nodes: ["gateway"], kind: "policy", packet: "Guardrails",
        value: "Reusable platform policies create a consistent baseline. Agent-specific evaluations and approval rules remain the builder's responsibility.",
        details: [["Policy", "Per-contract safety, PII and capacity rules"], ["Scope", "Only the policies actually configured apply"]], source: "access",
      },
      {
        id: "model", title: "Route to approved model capacity", short: "Gateway → model",
        description: "APIM resolves the permitted model alias and forwards the inference call to the configured backend. On supported Azure backends, managed identity plus RBAC can remove provider API keys from the application.",
        paths: ["gateway-model"], nodes: ["gateway", "model"], kind: "request", packet: "Model call",
        value: "Teams consume an approved logical endpoint while the platform curates and operates the underlying capacity.",
        details: [["Routing", "Approved backend / model alias"], ["Identity", "Gateway-to-backend identity, not automatic user OBO"]], source: "backend",
      },
      {
        id: "model-result", title: "The model responds to APIM", short: "Model → gateway",
        description: "The selected model processes the request and returns its completion or stream through the gateway. Configured outbound policies, usage extraction and diagnostics apply as supported by the selected API and policy.",
        paths: ["gateway-model:reverse"], nodes: ["model", "gateway"], kind: "response", packet: "Model output",
        value: "Routing, response handling and usage attribution stay in the shared platform rather than being reimplemented by each team.",
        details: [["Result", "Completion or response stream"], ["Attribution", "Consumer contract + model metadata"]], source: "learnGateway",
      },
      response,
      {
        id: "answer", title: "The agent completes the interaction", short: "Agent → user",
        description: "The agent uses the model result to answer the application. More reasoning, retrieval or tool steps may be needed in a real run; each supported dependency must be explicitly wired to its governed endpoint.",
        paths: ["app-agent:reverse"], nodes: ["agent", "app"], kind: "response", packet: "Answer",
        value: "The user sees the product's experience; the enterprise gets a governed path behind it.",
        details: [["Owner", "Agent product team"], ["Quality", "Evaluations, tracing and human oversight"]], source: "citadel",
      },
      audit,
    ],
  },
  mcp: {
    title: "MCP tool & data", subtitle: "An agent calls a governed tool; the tool enforces data access.", icon: "tool", outcome: "MCP · preview",
    note: "The Foundry portal gateway integration is preview and only routes eligible new MCP tools created after gateway connection; managed OAuth and some tool types are excluded. Explicit APIM publication is a separate configuration path. Tool/data authorisation and tool-level tracing are not supplied automatically by the gateway.",
    steps: [
      {
        id: "tool-intent", title: "The agent chooses an allowed tool", short: "Choose a tool",
        description: "During an existing run, the agent needs business information. The builder has configured an approved remote MCP endpoint through APIM, plus tool permissions and any required human approval.",
        paths: [], nodes: ["agent", "tools"], kind: "decision", packet: "Tool decision",
        value: "Agents can act on business systems through reusable, explicitly approved capabilities instead of unrestricted direct access.",
        details: [["Protocol", "Remote MCP over HTTPS"], ["Approval", "Configured by the agent / tool owner"]], source: "learnMcp",
      },
      ingress,
      {
        id: "tool-access", title: "Check permission to invoke this asset", short: "Authorise tool access",
        description: "APIM checks the consumer contract and the policies on the published MCP endpoint. An entry in API Center makes an asset discoverable; it does not grant permission to invoke it.",
        paths: [], nodes: ["gateway", "contracts"], kind: "policy", packet: "Tool policy",
        value: "Discovery and access are deliberately separate, so reuse does not mean unrestricted access.",
        details: [["Consumer", "Access contract"], ["Publication", "MCP endpoint and backend configuration"]], source: "publish",
      },
      {
        id: "tool-call", title: "Forward the MCP invocation", short: "Gateway → MCP",
        description: "The gateway forwards the tool request to its configured MCP server using the selected backend authentication mode. Consumer authentication at APIM and authentication at the tool are separate trust boundaries.",
        paths: ["gateway-tools"], nodes: ["gateway", "tools"], kind: "request", packet: "Tool call",
        value: "A stable, governed endpoint lets the platform apply API controls without making every product team own those controls.",
        details: [["Protocol", "MCP request"], ["Backend auth", "Configured identity, key or supported OAuth mode"]], source: "learnMcp",
      },
      {
        id: "data-access", title: "The tool accesses the business system", short: "Tool → data",
        description: "The MCP server executes the permitted operation. The business API or data service checks the effective identity and data permissions. A gateway token does not automatically confer user-delegated access to that data.",
        paths: ["tools-data"], nodes: ["tools", "data"], kind: "request", packet: "Data query",
        value: "Least privilege remains enforceable at the system of record, even when an agent requests the operation.",
        details: [["Boundary", "Tool → business API / data service"], ["Permission", "Backend-enforced; OBO only if implemented"]], source: "citadel",
      },
      {
        id: "data-result", title: "Return only the authorised result", short: "Data → tool",
        description: "The business service returns the data allowed for that operation and identity. The tool shapes it into an MCP result; data minimisation and sensitive-field handling belong in the tool and business service too.",
        paths: ["tools-data:reverse"], nodes: ["data", "tools"], kind: "response", packet: "Data result",
        value: "The gateway is one control, not a substitute for business-system authorisation and data protection.",
        details: [["Data scope", "Permitted records and fields"], ["Owner", "Business service / tool team"]], source: "citadel",
      },
      {
        id: "tool-result", title: "Bring the tool result back through APIM", short: "MCP → gateway",
        description: "The MCP response travels through APIM. Gateway logs and metrics describe this mediated call. Detailed tool execution spans require MCP-server and agent/runtime instrumentation.",
        paths: ["gateway-tools:reverse"], nodes: ["tools", "gateway"], kind: "response", packet: "Tool result",
        value: "Platform teams can verify that the call used the governed route while builders retain detailed execution observability.",
        details: [["Gateway view", "API request and response diagnostics"], ["Tool view", "Separate runtime / server traces"]], source: "learnMcp",
      },
      response,
      {
        id: "continue", title: "Continue the agent run", short: "Continue the run",
        description: "The calling agent receives the result and decides its next action. Any subsequent model call must use the governed model connection; the MCP result does not itself bypass model or data policies.",
        paths: [], nodes: ["agent"], kind: "response", packet: "Continue",
        value: "One agent can combine approved models and tools while their distinct trust boundaries remain visible.",
        details: [["Next", "Reason, call another tool, or answer"], ["Accountability", "Agent builder and registered owner"]], source: "citadel",
      },
    ],
  },
  a2a: {
    title: "Agent-to-agent", subtitle: "Delegate a task to a published specialist through the gateway.", icon: "agent", outcome: "A2A · preview",
    note: "The accelerator's publish contracts and Foundry-hosted A2A publication are preview. This is a logical request/result exchange; task polling or streaming may require multiple calls. Delegation does not automatically propagate user identity or permissions.",
    steps: [
      {
        id: "delegate", title: "Choose an approved specialist", short: "Plan delegation",
        description: "The calling agent needs a specialist capability. The specialist has been published behind APIM, and the caller has explicit access. API Center may provide discovery metadata, outside the live invocation path.",
        paths: [], nodes: ["agent", "peer", "catalog"], kind: "decision", packet: "Delegate",
        value: "Teams can reuse a specialist agent without exposing its raw backend or assuming every caller has permission.",
        details: [["Asset", "Published specialist agent"], ["Protocol", "Configured A2A interface"]], source: "publish",
      },
      ingress,
      {
        id: "agent-access", title: "Authorise the delegated call", short: "Check delegation access",
        description: "The access contract permits this caller to use the published agent. Gateway policies apply to that API. The receiving agent still needs its own identity, tool permissions and operational owner.",
        paths: [], nodes: ["gateway", "contracts"], kind: "policy", packet: "Agent policy",
        value: "A reusable agent becomes a governed enterprise capability, not an anonymous URL shared between teams.",
        details: [["Grant", "Explicit access to the published asset"], ["Identity", "Caller and specialist remain distinct"]], source: "access",
      },
      {
        id: "specialist", title: "Send the task to the specialist", short: "Gateway → specialist",
        description: "APIM routes the task to the configured agent backend. The specialist executes within its own runtime and authorisation boundary. Its downstream calls need their own governance configuration.",
        paths: ["gateway-peer"], nodes: ["gateway", "peer"], kind: "request", packet: "A2A task",
        value: "Independent teams can compose capabilities while retaining ownership of each agent's implementation and lifecycle.",
        details: [["Routing", "Published A2A backend"], ["Execution", "Specialist's own environment"]], source: "publish",
      },
      {
        id: "specialist-result", title: "Return a task result or status", short: "Specialist → gateway",
        description: "The specialist returns its result or task status through the gateway. This simplified sequence omits repeated polling or streaming exchanges that a real A2A implementation may use.",
        paths: ["gateway-peer:reverse"], nodes: ["peer", "gateway"], kind: "response", packet: "Task result",
        value: "The API boundary stays observable even when the agents use different hosting frameworks.",
        details: [["Result", "Task status / response"], ["Observability", "Gateway diagnostics + instrumented runtimes"]], source: "publish",
      },
      response, audit,
    ],
  },
  failover: {
    title: "Resilient fallback", subtitle: "Recover from backend throttling using approved alternative capacity.", icon: "bolt", outcome: "Configured recovery",
    note: "This example uses an approved same-model fallback pool. Failover is not free capacity: model compatibility, data residency, retry limits, state/session affinity and available quota must be configured and tested. If no eligible backend can serve the call, return an explicit error.",
    steps: [
      ingress, entitlement,
      {
        id: "preferred", title: "Try the preferred backend", short: "Preferred capacity",
        description: "The configured routing policy chooses the preferred model backend. A common pattern prioritises provisioned capacity before eligible alternative capacity; the actual strategy comes from backend and policy configuration.",
        paths: ["gateway-model"], nodes: ["gateway", "model"], kind: "request", packet: "Model call",
        value: "The platform can choose capacity centrally without forcing every consumer to implement backend selection.",
        details: [["Selection", "Configured pool priority / weight"], ["Example", "Approved same-model capacity"]], source: "learnGateway",
      },
      {
        id: "throttle", title: "The primary backend returns 429", short: "Backend throttles",
        description: "The selected backend is throttled. APIM receives the response. A configured circuit breaker can use Retry-After to temporarily avoid an unavailable backend; retry and fallback rules determine the next attempt.",
        paths: ["gateway-model:reverse"], nodes: ["model", "gateway"], kind: "error", packet: "429",
        value: "Backend pressure is handled in the shared platform instead of becoming inconsistent retry storms across applications.",
        details: [["Failure", "Backend 429, not a consumer-contract denial"], ["Recovery", "Bounded retry and circuit-breaker rules"]], source: "learnGateway",
      },
      {
        id: "fallback", title: "Select approved healthy capacity", short: "Approved fallback",
        description: "The policy selects an eligible secondary backend already declared in the pool and allowed by the contract. In this example it serves the same model. The gateway must not silently choose an unapproved region or substitute an arbitrary model.",
        paths: ["gateway-fallback"], nodes: ["gateway", "fallback"], kind: "request", packet: "Retry",
        value: "Resilience remains inside governance boundaries: recovery does not become an escape from policy.",
        details: [["Capacity", "Preconfigured eligible backend"], ["Constraint", "Compatibility, residency and quota still apply"]], source: "backend",
      },
      {
        id: "recovered", title: "The secondary backend succeeds", short: "Secondary responds",
        description: "The healthy backend returns the model response. Diagnostics retain the retry and backend outcome so operators can investigate recurring throttling and plan capacity.",
        paths: ["gateway-fallback:reverse"], nodes: ["fallback", "gateway"], kind: "response", packet: "200 OK",
        value: "The caller keeps a stable endpoint while operations can see why alternative capacity was used.",
        details: [["Result", "Illustrative successful recovery"], ["Caveat", "Success depends on actual healthy capacity"]], source: "learnGateway",
      },
      response, audit,
    ],
  },
  blocked: {
    title: "Policy blocks a request", subtitle: "A consumer token limit stops the call before model execution.", icon: "shield", outcome: "Denied at the gateway",
    note: "The illustrated 429 is an inbound consumer token-limit rejection with prompt-token estimation enabled, not a backend throttle. Other authentication, content-safety or access denials have policy-specific responses. No model request is made in this flow.",
    steps: [
      ingress,
      {
        id: "reject", title: "Stop an over-limit consumer at APIM", short: "Reject before the model",
        description: "The consumer is authenticated, but its contract's token allowance is exhausted. With inbound prompt-token estimation enabled for this example, the gateway rejects the request before calling any model backend.",
        paths: [], nodes: ["gateway", "contracts"], kind: "error", packet: "Blocked",
        value: "One use case cannot consume the shared model capacity beyond its configured allowance. A denial is an intentional control outcome.",
        details: [["Decision", "Inbound token-limit policy"], ["Backend calls", "None in this teaching scenario"]], source: "learnGateway",
      },
      {
        id: "denial", title: "Return an explicit 429 to the agent", short: "Return the denial",
        description: "The gateway returns a structured, policy-specific error over the return route. The client should honour applicable retry guidance or surface the quota issue, not bypass the gateway and call the model directly.",
        paths: ["egress"], nodes: ["gateway", "agent"], kind: "error", packet: "429 denied",
        value: "Predictable failure behaviour protects the platform and gives the application a clear action to take.",
        details: [["Response", "429 · consumer limit exceeded"], ["Do not", "Retry via a raw provider endpoint"]], source: "learnGateway",
      },
      {
        id: "denial-log", title: "Record the control outcome", short: "Observe the rejection",
        description: "Configured gateway diagnostics and alerts record the rejection and its consumer context. There are no model-consumption tokens from an inference call that never occurred; handle denied-call records distinctly from billable model usage.",
        paths: ["gateway-metrics"], nodes: ["gateway", "metrics"], kind: "telemetry", packet: "Policy event",
        value: "Operators can distinguish intentional policy protection from backend capacity failures.",
        details: [["Signal", "Gateway rejection / alert"], ["Attribution", "Contract identity and failure category"]], source: "observability",
      },
    ],
  },
  telemetry: {
    title: "Usage & chargeback", subtitle: "Follow the asynchronous evidence trail after a model call.", icon: "chart", outcome: "Asynchronous",
    note: "This walkthrough starts after a model interaction and expands the usage branch, not the synchronous response path. Gateway diagnostics and agent reasoning traces are different. Pricing and attribution rules must be maintained; usage-derived showback should be reconciled with actual billing.",
    steps: [
      {
        id: "usage-context", title: "Start with a completed governed call", short: "A completed model call",
        description: "The gateway has processed a model interaction and resolved its consumer contract, model and usage metadata. The user-facing response does not wait for the full analytics chain shown below.",
        paths: [], nodes: ["gateway"], kind: "telemetry", packet: "Usage context",
        value: "Per-consumer context is available centrally because the relevant model call used the gateway.",
        details: [["Context", "Contract, model and token metadata"], ["Timing", "After / alongside the response"]], source: "observability",
      },
      {
        id: "metrics", title: "Send diagnostics to the operations view", short: "Gateway diagnostics",
        description: "APIM diagnostics and configured custom metrics feed Application Insights and Azure Monitor. Detailed LLM logs can go to Log Analytics. Message/body capture is optional, not a prerequisite for basic usage metrics.",
        paths: ["gateway-metrics"], nodes: ["gateway", "metrics"], kind: "telemetry", packet: "Diagnostics",
        value: "Operations can investigate errors, latency and usage without treating sensitive prompt capture as an automatic default.",
        details: [["Destination", "Application Insights / configured Monitor logs"], ["Agent spans", "Require agent/runtime instrumentation"]], source: "observability",
      },
      {
        id: "events", title: "Stream a usage event", short: "APIM → Event Hubs",
        description: "The configured gateway usage policy sends an event to Event Hubs. This stream decouples gateway request handling from downstream usage ingestion and analytics processing.",
        paths: ["gateway-events"], nodes: ["gateway", "events"], kind: "telemetry", packet: "Usage event",
        value: "Usage processing can evolve independently of every application consuming the platform.",
        details: [["Mechanism", "Configured log-to-eventhub policy"], ["Path", "Asynchronous usage stream"]], source: "observability",
      },
      {
        id: "ingestion", title: "Process the event with a Logic App", short: "Event Hubs → Logic App",
        description: "The accelerator's ingestion workflow processes the usage event and applies the configured enrichment and storage logic. This is platform usage processing, not an agent's business workflow.",
        paths: ["events-logic"], nodes: ["events", "logic"], kind: "telemetry", packet: "Ingest",
        value: "A common pipeline can normalise usage evidence for the estate instead of each team building a separate collector.",
        details: [["Processor", "Usage-ingestion Logic App"], ["Owner", "Platform / FinOps operations"]], source: "observability",
      },
      {
        id: "storage", title: "Persist attributed usage records", short: "Logic App → Cosmos DB",
        description: "Processed usage records are stored in the configured Cosmos DB usage container. This store supports usage analytics; it is not automatically a transcript store or the application's conversation memory.",
        paths: ["logic-cosmos"], nodes: ["logic", "cosmos"], kind: "telemetry", packet: "Usage record",
        value: "Contract-scoped records make longer-term usage analysis and internal cost allocation possible.",
        details: [["Store", "Cosmos DB usage data"], ["Governance", "Retention, access and data minimisation"]], source: "observability",
      },
      {
        id: "finops", title: "Turn usage into showback and chargeback", short: "Cosmos DB → Power BI",
        description: "Configured reporting reads attributed usage for model, team and use-case views. Pricing assumptions, allocation rules and reconciliation with billed costs determine whether the output is fit for financial reporting.",
        paths: ["cosmos-finops"], nodes: ["cosmos", "finops"], kind: "telemetry", packet: "Report",
        value: "A shared platform can make consumption accountable without promising that usage estimates equal an Azure invoice.",
        details: [["Audience", "FinOps, platform owners, business teams"], ["Validation", "Reconcile usage-derived costs with billing"]], source: "observability",
      },
    ],
  },
};

export const layers = {
  1: {
    title: "Governance Hub", icon: "shield", action: "Provision centrally",
    description: "A shared runtime enforcement plane. API Management governs the configured model, tool and agent calls; API Center provides discovery metadata, not an inline proxy.",
    resources: ["API Management: consumer access, routing and policy", "Microsoft Foundry / AI services: approved capacity and configured safety services", "API Center: recommended catalog and discovery", "Application Insights, Log Analytics, Event Hubs, Logic Apps and Cosmos DB: platform evidence"],
    owner: "Platform Engineering runs the hub; AI CoE sets policy; FinOps owns capacity and allocation standards.",
    source: "gateway",
  },
  2: {
    title: "Agent Operations", icon: "agent", action: "Provision / onboard per business unit or use case",
    description: "Independent execution environments deliver the product and its first line of trust. Foundry can provide managed runtime and observability; teams may also bring supported container or external runtimes.",
    resources: ["Microsoft Foundry Agent Service: managed or hosted-agent patterns", "Container Apps / AKS: bring-your-own execution where appropriate", "Configured model, MCP and agent connections through APIM", "Agent traces, evaluations, red-teaming and use-case-specific guardrails"],
    owner: "AI Engineering owns agent quality and operations; Platform Engineering supplies approved landing-zone patterns.",
    source: "citadel",
  },
  3: {
    title: "Agent Management", icon: "person", action: "Activate and configure ownership & lifecycle",
    description: "Treat an agent as an accountable enterprise asset with an identity, owner and lifecycle. Agent 365 and Entra Agent ID capabilities depend on the agent's hosting and integration pattern.",
    resources: ["Agent 365: agent management and estate-level accountability", "Entra Agent ID: supported agent identity and lifecycle patterns", "Named owners, permissions and revocation processes", "Register or federate existing agents as supported; do not assume automatic coverage"],
    owner: "IAM owns identity and lifecycle policy; agent builders register and maintain accountable agents.",
    source: "citadel",
  },
  4: {
    title: "Security Foundation", icon: "shield", action: "Activate and configure cross-cutting protection",
    description: "Identity, threat protection and data governance support every other layer. These services reinforce runtime controls; they are not extra proxies every request passes through.",
    resources: ["Microsoft Entra: authentication, authorisation and access controls", "Microsoft Defender: supported AI posture and threat protection", "Microsoft Purview: supported data governance and compliance controls", "Configure integrations, alerts, retention, investigation and response ownership"],
    owner: "Security Operations, IAM, data-governance and compliance teams own their respective controls and evidence.",
    source: "citadel",
  },
};

export const contracts = {
  backend: { title: "Backend contracts curate model supply", description: "Declare the model backends, aliases and approved capacity pools the gateway can route to. These are platform-side resources; they do not by themselves grant a consumer access.", from: "Approved model capacity", to: "Gateway backend pool", distinction: "Question answered: which model capacity exists, and how may the gateway select it?", source: "backend" },
  publish: { title: "Publish contracts expose reusable assets", description: "Publish a protected MCP tool or A2A agent endpoint with its backend and policies, optionally registering metadata in API Center. This accelerator feature is preview.", from: "MCP tool / A2A agent", to: "Published gateway API", distinction: "Publication is not permission. Consumers still need governed access through an access contract.", source: "publish" },
  access: { title: "Access contracts grant scoped consumption", description: "Bind a business unit, use case and environment to approved assets and policies. Configure the APIM product, subscription, identity rules, limits and supported credential delivery.", from: "Agent / use case", to: "Entitled gateway assets", distinction: "Question answered: who may use which assets, under which policy and capacity constraints?", source: "access" },
};
