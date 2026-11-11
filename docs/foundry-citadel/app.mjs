import { scenarios, sources, networkModes, layers, contracts } from "./flows.mjs";
import { accessExamples, getAccessExample } from "./access-contracts.mjs";
import { publishExamples, getPublishExample } from "./publish-contracts.mjs";

const svgNS = "http://www.w3.org/2000/svg";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const state = {
  view: "traffic", scenario: "inference", step: 0, network: "dedicated",
  playing: false, progress: 0, finished: false, speed: 1,
  motion: !reducedMotion.matches, motionOverride: false, selectedNode: null, layer: "1",
  samples: {
    access: { example: "inference", file: "parameters", section: "template" },
    publish: { example: "mcp", file: "parameters", section: "template" },
  },
};
const sampleDefinitions = {
  access: { examples: accessExamples, getExample: getAccessExample },
  publish: { examples: publishExamples, getExample: getPublishExample },
};
const kinds = {
  request: { label: "Request", color: "var(--request)" },
  response: { label: "Response", color: "var(--response)" },
  control: { label: "Control plane", color: "var(--control)" },
  policy: { label: "Runtime policy", color: "var(--accent)" },
  decision: { label: "Agent decision", color: "var(--accent)" },
  telemetry: { label: "Async telemetry", color: "var(--telemetry)" },
  error: { label: "Blocked / error", color: "var(--error)" },
};

function $(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
}

function svg(tag, attributes = {}, text) {
  const element = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(name, className = "icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function sourceLink(element, key) {
  const source = sources[key];
  if (!source) throw new Error(`Unknown source: ${key}`);
  element.href = source.url;
  element.target = "_blank";
  element.rel = "noopener noreferrer";
}

const nodes = {
  app: {
    x: 124, y: 147, w: 184, h: 64, icon: "person", color: "var(--layer-2)",
    title: "User application", subtitle: "The product experience", layer: "Experience · adjacent to L2",
    description: "The application is the user's entry point. Its own authentication and product experience are distinct from the agent's governed calls to AI dependencies.",
    facts: ["Users do not call the model backend directly in this example.", "The application starts an agent run in the selected runtime.", "APIM does not automatically intercept every user-to-application interaction."],
    value: "Product teams retain control of the experience while reusing enterprise AI platform capabilities.", source: "citadel",
  },
  agent: {
    x: 124, y: 305, w: 184, h: 82, icon: "agent", color: "var(--layer-2)", eyebrow: "SPOKE A · MANAGED",
    title: "Foundry agent", subtitle: "Team-owned runtime", layer: "L2 · Agent Operations",
    description: "A managed or hosted-agent runtime delivers the use case and its first line of trust. The relevant model and tool connections must point at the governed gateway.",
    facts: ["Agent builders own traces, evaluations, red-teaming and use-case guardrails.", "Model calls, MCP tool invocations and A2A delegation are separate interactions.", "Gateway coverage depends on the selected runtime, connection and supported integration."],
    value: "Teams build close to their business context without each creating a separate enterprise governance stack.", source: "citadel",
  },
  byo: {
    x: 124, y: 475, w: 184, h: 70, icon: "agent", color: "var(--layer-2)", eyebrow: "SPOKE B · BRING YOUR OWN",
    title: "BYO agent", subtitle: "Container Apps / AKS", layer: "L2 · An additional execution spoke",
    description: "Another team can use a different approved execution environment. This node illustrates horizontal adoption; it is not a second hop in the selected agent's run.",
    facts: ["Configure its model, tool and agent endpoints to use APIM where supported.", "Use workload identity or another supported consumer authentication pattern.", "Instrument its runtime and register accountable ownership; do not assume native coverage."],
    value: "A shared governance plane does not require every team to use the same hosting framework.", source: "citadel",
  },
  firewall: {
    x: 298, y: 328, w: 80, h: 64, icon: "firewall", color: "var(--muted)", compact: true,
    title: "Firewall", subtitle: "Network rules", layer: "Enterprise connectivity · not a fifth Citadel layer",
    description: "In the dedicated-spoke layout, the enterprise hub firewall forwards agent-spoke traffic to the separate governance spoke. It applies network controls, not the gateway's semantic or consumer API policies.",
    facts: ["Spoke-to-spoke reachability needs explicit routes and forwarding; VNet peering is not transitive.", "The hub-based layout reaches APIM in the connectivity hub without this separate governance-spoke ingress hop.", "Backends in other spokes also need explicit firewall and return-route design; those subnet hops are not expanded here."],
    value: "Citadel can fit existing enterprise landing-zone connectivity while separating network control from API governance.", source: "network",
  },
  gateway: {
    x: 500, y: 305, w: 240, h: 112, icon: "shield", color: "var(--layer-1)", eyebrow: "UNIFIED AI GATEWAY",
    title: "API Management", subtitle: "Authenticate · authorise · govern", footer: "Policy → route → observe", layer: "L1 · Governance Hub",
    description: "APIM is the runtime front door for the model, tool and agent APIs configured to use it. It is an enforcement point, not the agent's reasoning engine.",
    facts: ["Apply contract-scoped access, configured safety policies and request/token limits.", "Route to curated backends with supported pools, bounded retries and circuit breakers.", "Emit diagnostics and usage signals. Full agent and tool traces require their own instrumentation."],
    value: "Govern once at a reusable boundary instead of asking every product team to build its own policy infrastructure.", source: "learnGateway",
  },
  catalog: {
    x: 500, y: 147, w: 220, h: 64, icon: "catalog", color: "var(--control)",
    title: "API Center", subtitle: "Catalog · discover · reuse", layer: "L1 · Discovery / control plane",
    description: "API Center catalogs approved APIs and AI assets. It is not a serial proxy that every inference or MCP invocation must traverse.",
    facts: ["Metadata can describe ownership, versions and discoverable assets.", "Publication and optional registration are provisioning operations.", "Discovering an asset does not grant permission to invoke it."],
    value: "Teams can find approved capabilities for reuse without confusing a catalog entry with runtime authorisation.", source: "gateway",
  },
  contracts: {
    x: 500, y: 475, w: 220, h: 72, icon: "file", color: "var(--control)", eyebrow: "DECLARATIVE CONTROL PLANE",
    title: "Governance contracts", subtitle: "Backend · publish · access", layer: "L1 · Configuration, not a runtime hop",
    description: "Infrastructure-as-code contracts configure curated model supply, published MCP/A2A assets and per-use-case consumption policies.",
    facts: ["Backend contracts define the model capacity and routing supply.", "Publish contracts expose tools and agents; this feature is preview.", "Access contracts define who can consume approved assets and under which policies."],
    value: "Versioned, separate contracts let the platform manage shared supply while teams onboard scoped demand.", source: "gateway",
  },
  model: {
    x: 852, y: 137, w: 220, h: 64, icon: "model", color: "var(--layer-1)",
    title: "Primary model", subtitle: "Approved Foundry capacity", layer: "Governed asset · model backend",
    description: "A model deployment selected from the gateway's configured, approved backend capacity. Its service permissions and network exposure are separate design decisions.",
    facts: ["The client uses a model alias or configured API, not the raw backend credential.", "Gateway-to-backend managed identity requires the appropriate service RBAC.", "Content filtering and model limits still apply at the model service."],
    value: "Capacity can be curated centrally and consumed through stable, policy-controlled endpoints.", source: "backend",
  },
  fallback: {
    x: 852, y: 235, w: 220, h: 64, icon: "model", color: "var(--layer-1)",
    title: "Secondary capacity", subtitle: "Approved same-model pool", layer: "Governed asset · configured resilience",
    description: "An eligible alternative backend used by the fallback walkthrough. It is preconfigured capacity, not a model or region discovered arbitrarily when a request fails.",
    facts: ["Validate model compatibility, data residency and real available quota.", "Stateful APIs may require session affinity and careful retry semantics.", "No healthy eligible backend means an explicit error, not guaranteed success."],
    value: "Shared routing and recovery can improve resilience without giving up the platform's governance boundaries.", source: "learnGateway",
  },
  tools: {
    x: 852, y: 325, w: 220, h: 64, icon: "tool", color: "var(--layer-2)",
    title: "MCP tool server", subtitle: "Approved business tool", layer: "Governed asset · tool backend",
    description: "A remote MCP server exposes selected business operations. APIM mediates the configured API call; the server and business service still enforce their own authorisation.",
    facts: ["Configure supported consumer and backend authentication separately.", "Foundry portal automatic gateway routing has preview eligibility restrictions.", "Instrument tool execution for detailed spans; gateway logs are not tool-level traces."],
    value: "Reuse business capabilities through an approved API boundary instead of giving agents unrestricted system access.", source: "learnMcp",
  },
  peer: {
    x: 852, y: 425, w: 220, h: 64, icon: "agent", color: "var(--layer-3)",
    title: "Specialist agent", subtitle: "A2A endpoint · preview", layer: "Governed asset · downstream agent",
    description: "A reusable specialist executes a delegated task in its own environment. The gateway's published endpoint mediates access, but does not collapse agent identities into one.",
    facts: ["Publish contracts and Foundry-hosted A2A publication are preview.", "The caller needs explicit access; publishing alone is not permission.", "The specialist's downstream tools, models and delegated identities need independent configuration."],
    value: "Compose team-owned specialists while preserving each agent's ownership, permissions and lifecycle.", source: "publish",
  },
  data: {
    x: 852, y: 525, w: 220, h: 56, icon: "database", color: "var(--layer-3)",
    title: "Enterprise data / API", subtitle: "Backend-enforced permissions", layer: "Business-system authorisation boundary",
    description: "The system of record authorises the effective identity and operation. It may be a database, search service or business API reached through a tool.",
    facts: ["Enforce permitted records, fields and business actions here too.", "User-delegated access needs an explicit implementation; it is not implied by APIM.", "Configure data minimisation, classification and auditing for the actual service."],
    value: "Business data remains protected at its authoritative boundary, even when the caller is an AI agent.", source: "citadel",
  },
  metrics: {
    x: 100, y: 660, w: 154, h: 56, icon: "chart", color: "var(--telemetry)", tiny: true,
    title: "App Insights", subtitle: "Gateway diagnostics", layer: "Cross-cutting observability",
    description: "Gateway diagnostics and custom metrics provide the platform view. Log Analytics can receive configured detailed LLM logs; instrumented runtimes provide agent reasoning and tool spans.",
    facts: ["Correlate requests and backend dependencies using configured diagnostics.", "Prompt/body capture is optional and has access, retention and privacy implications.", "Do not interpret gateway-only telemetry as a full agent execution trace."],
    value: "Different operational audiences get useful evidence without conflating platform health with agent quality.", source: "observability",
  },
  events: {
    x: 300, y: 660, w: 154, h: 56, icon: "events", color: "var(--telemetry)", tiny: true,
    title: "Event Hubs", subtitle: "Usage-event stream", layer: "Asynchronous usage pipeline",
    description: "The configured APIM log-to-eventhub policy emits usage events for downstream processing.",
    facts: ["The event branch is asynchronous, not an inline model-response hop.", "Event and diagnostic streams serve different operational purposes.", "Monitor ingestion, delivery and processing health as platform responsibilities."],
    value: "Decouple per-request AI traffic from downstream usage analytics.", source: "observability",
  },
  logic: {
    x: 500, y: 660, w: 154, h: 56, icon: "bolt", color: "var(--telemetry)", tiny: true,
    title: "Logic App", subtitle: "Usage ingestion", layer: "Asynchronous usage pipeline",
    description: "The accelerator's usage-ingestion workflow processes usage events for storage and reporting.",
    facts: ["This is platform analytics processing, not the agent's business workflow.", "Apply configured enrichment and storage logic.", "Operate workflow permissions, private connectivity and processing health explicitly."],
    value: "Use a common ingestion mechanism instead of separate analytics collectors in each application.", source: "observability",
  },
  cosmos: {
    x: 700, y: 660, w: 154, h: 56, icon: "database", color: "var(--telemetry)", tiny: true,
    title: "Cosmos DB", subtitle: "Attributed usage", layer: "Usage analytics store",
    description: "The usage store retains processed records for longer-term analysis and allocation.",
    facts: ["Usage records are distinct from an application's conversation memory.", "Configure retention and least-privilege access.", "Maintain allocation and pricing assumptions for reporting."],
    value: "Per-contract evidence enables analysis across teams, models and use cases.", source: "observability",
  },
  finops: {
    x: 900, y: 660, w: 154, h: 56, icon: "chart", color: "var(--telemetry)", tiny: true,
    title: "Power BI", subtitle: "Cost allocation", layer: "FinOps reporting",
    description: "Configured reporting reads attributed usage and allocation information for platform and business owners.",
    facts: ["Usage-derived cost is not automatically identical to an Azure invoice.", "Reconcile pricing, allocation rules and actual billed costs.", "Treat reporting access and data freshness as operational controls."],
    value: "Make shared AI consumption accountable with a traceable allocation method.", source: "observability",
  },
};

const edges = {
  "app-agent": { d: "M124 179 V264" },
  "agent-firewall": { d: "M216 305 C238 305 236 328 258 328", network: "dedicated" },
  "firewall-gateway": { d: "M338 328 C354 328 360 305 380 305", network: "dedicated" },
  "agent-gateway": { d: "M216 305 H380", network: "hub" },
  "byo-firewall": { d: "M216 475 C248 475 238 348 258 348", network: "dedicated" },
  "byo-gateway": { d: "M216 475 C288 475 302 341 380 341", network: "hub" },
  "gateway-model": { d: "M620 285 C680 285 684 137 742 137" },
  "gateway-fallback": { d: "M620 295 C677 295 686 235 742 235" },
  "gateway-tools": { d: "M620 315 C680 315 685 325 742 325" },
  "gateway-peer": { d: "M620 335 C670 335 682 425 742 425" },
  "tools-data": { d: "M962 325 C995 325 995 525 962 525" },
  "catalog-gateway": { d: "M500 249 V179", kind: "control", label: "Publish metadata", lx: 512, ly: 209 },
  "contracts-gateway": { d: "M500 439 V361", kind: "control", label: "Configure policy", lx: 512, ly: 404 },
  "gateway-metrics": { d: "M380 335 H350 V584 H100 V632", kind: "telemetry" },
  "gateway-events": { d: "M620 351 H656 V590 H300 V632", kind: "telemetry" },
  "events-logic": { d: "M377 660 H423", kind: "telemetry" },
  "logic-cosmos": { d: "M577 660 H623", kind: "telemetry" },
  "cosmos-finops": { d: "M777 660 H823", kind: "telemetry" },
};
const pathElements = new Map();
const nodeElements = new Map();
let activeRoutes = [];
let packets = [];
let frame = null;
let lastFrameTime = null;

function renderMap() {
  for (const [id, edge] of Object.entries(edges)) {
    const path = svg("path", { id: `edge-${id}`, d: edge.d, class: `edge ${edge.kind || "request"}` });
    $("#edges").append(path);
    pathElements.set(id, path);
    if (edge.label) $("#edges").append(svg("text", { x: edge.lx, y: edge.ly, class: "edge-label" }, edge.label));
  }
  for (const [id, node] of Object.entries(nodes)) {
    const left = node.x - node.w / 2;
    const top = node.y - node.h / 2;
    const group = svg("g", {
      class: `node${id === "gateway" ? " gateway" : ""}${node.tiny ? " tiny" : ""}${node.compact ? " firewall" : ""}`,
      tabindex: "0", role: "button", "aria-label": `Inspect ${node.title}`, "aria-pressed": "false",
      "aria-controls": "component-panel",
      "data-node": id, style: `--node-color:${node.color}`,
    });
    group.append(svg("title", {}, `${node.title} · ${node.layer}`));
    group.append(svg("rect", { x: left, y: top + 3, width: node.w, height: node.h, rx: 7, class: "node-shadow" }));
    group.append(svg("rect", { x: left, y: top, width: node.w, height: node.h, rx: 7, class: "node-box" }));
    const iconSize = node.tiny || node.compact ? 20 : 25;
    const iconX = node.compact ? node.x - 10 : left + 12;
    const iconY = node.compact ? top + 9 : node.y - 12;
    if (!node.compact) group.append(svg("rect", { x: iconX - 4, y: iconY - 5, width: iconSize + 8, height: iconSize + 10, rx: 5, class: "node-icon-bg" }));
    group.append(svg("use", { href: `#i-${node.icon}`, x: iconX, y: iconY, width: iconSize, height: iconSize, class: "icon node-icon" }));
    if (node.compact) {
      group.append(svg("text", { x: node.x, y: top + 46, class: "node-title", "text-anchor": "middle" }, node.title));
    } else {
      const textX = left + (node.tiny ? 43 : 48);
      if (node.eyebrow) group.append(svg("text", { x: left + 12, y: top + 15, class: "node-eyebrow" }, node.eyebrow));
      const titleY = node.y + (node.eyebrow ? 5 : -1);
      group.append(svg("text", { x: textX, y: titleY, class: "node-title" }, node.title));
      group.append(svg("text", { x: textX, y: titleY + 17, class: "node-subtitle" }, node.subtitle));
      if (node.footer) group.append(svg("text", { x: left + 12, y: top + node.h - 12, class: "node-footer" }, node.footer));
    }
    $("#nodes").append(group);
    nodeElements.set(id, group);
  }
  renderNetwork();
}

function renderNetwork() {
  $("#architecture").classList.toggle("hub-mode", state.network === "hub");
  $("#governance-location").textContent = networkModes[state.network].label;
  nodeElements.get("firewall").toggleAttribute("hidden", state.network === "hub");
  for (const [id, edge] of Object.entries(edges)) {
    pathElements.get(id).toggleAttribute("hidden", Boolean(edge.network && edge.network !== state.network));
  }
  $("#diagram-title").textContent = `AI Citadel architecture: ${networkModes[state.network].label.toLowerCase()}`;
}

function resolveRoutes(paths) {
  return paths.flatMap(reference => {
    if (reference === "ingress") return networkModes[state.network].ingress.map(id => ({ id, reverse: false }));
    if (reference === "egress") return [...networkModes[state.network].ingress].reverse().map(id => ({ id, reverse: true }));
    const [id, direction] = reference.split(":");
    if (!pathElements.has(id)) throw new Error(`Unknown flow path: ${id}`);
    return [{ id, reverse: direction === "reverse" }];
  });
}

function currentScenario() { return scenarios[state.scenario]; }
function currentStep() { return currentScenario().steps[state.step]; }

function renderScenarioNavigation() {
  if (!$("#scenario-nav").childElementCount) {
    $("#scenario-nav").innerHTML = Object.entries(scenarios).map(([id, scenario], index) =>
      `<button class="flow-button" data-scenario="${id}"><span class="flow-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHTML(scenario.title)}</span></button>`
    ).join("");
  }
  for (const button of $("#scenario-nav").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === state.scenario));
  }
}

function renderScenario() {
  const scenario = currentScenario();
  $("#scenario-title").textContent = scenario.title;
  $("#scenario-subtitle").textContent = scenario.subtitle;
  $("#scenario-icon use").setAttribute("href", `#i-${scenario.icon}`);
  $("#scenario-note").textContent = scenario.note;
  $("#flow-outcome").textContent = scenario.outcome;
  $("#step-range").max = String(scenario.steps.length - 1);
  $("#journey").innerHTML = scenario.steps.map((step, index) =>
    `<li><button data-step="${index}"><span class="journey-index">${index + 1}</span><span>${escapeHTML(step.short)}</span></button></li>`
  ).join("");
  renderScenarioNavigation();
  renderStep();
}

function renderStep() {
  const step = currentStep();
  const kind = kinds[step.kind];
  if (!kind) throw new Error(`Unknown flow kind: ${step.kind}`);
  state.selectedNode = null;
  $(".workspace").style.setProperty("--flow-color", kind.color);
  $("#step-panel").hidden = false;
  $("#component-panel").hidden = true;
  $("#inspector-label").textContent = "Trace inspector";
  $("#step-counter").textContent = `Step ${state.step + 1} of ${currentScenario().steps.length}`;
  $("#step-kind").textContent = kind.label;
  $("#step-title").textContent = step.title;
  $("#inline-step-counter").textContent = String(state.step + 1).padStart(2, "0");
  $("#inline-step-title").textContent = step.title;
  $("#inline-step-value").textContent = step.value;
  $("#step-description").textContent = step.networkArrival ? networkModes[state.network].arrival
    : step.networkDeparture ? networkModes[state.network].departure : step.description;
  $("#step-value").textContent = step.value;
  const details = [...step.details];
  if (step.networkArrival || step.networkDeparture || step.id === "denial") {
    details.push(["Network", networkModes[state.network].route]);
  }
  $("#step-details").innerHTML = details.map(([name, value]) => `<dt>${escapeHTML(name)}</dt><dd>${escapeHTML(value)}</dd>`).join("");
  sourceLink($("#step-source"), step.source);
  for (const button of $("#journey").querySelectorAll("button")) {
    const index = Number(button.dataset.step);
    button.toggleAttribute("aria-current", index === state.step);
    if (index === state.step) button.setAttribute("aria-current", "step");
    button.classList.toggle("passed", index < state.step);
    button.querySelector(".journey-index").innerHTML = index < state.step ? icon("check") : String(index + 1);
  }
  activeRoutes = resolveRoutes(step.paths);
  for (const [id, path] of pathElements) {
    const active = activeRoutes.find(route => route.id === id);
    path.classList.toggle("active", Boolean(active));
    path.classList.toggle("reverse", Boolean(active?.reverse));
  }
  const activeNodes = new Set(step.nodes);
  if (state.network === "dedicated" && step.paths.some(path => path === "ingress" || path === "egress")) activeNodes.add("firewall");
  for (const [id, group] of nodeElements) {
    group.classList.toggle("active", activeNodes.has(id));
    group.classList.remove("selected");
    group.setAttribute("aria-pressed", "false");
  }
  renderPackets();
  renderPlayback();
  $("#step-range").value = String(state.step);
  $("#step-range").setAttribute("aria-valuetext", `Step ${state.step + 1}: ${step.title}`);
  $("#progress-text").textContent = `${state.step + 1} / ${currentScenario().steps.length}`;
  $("#step-announcement").textContent = `${currentScenario().title}. Step ${state.step + 1}: ${step.title}. ${step.value}`;
}

function makePacket(label) {
  const group = svg("g");
  group.append(svg("circle", { r: 12, class: "packet-halo" }));
  group.append(svg("circle", { r: 5, class: "packet-dot" }));
  const width = Math.max(43, label.length * 6.8 + 18);
  group.append(svg("rect", { x: -width / 2, y: -31, width, height: 20, rx: 4, class: "packet-label-bg" }));
  group.append(svg("text", { x: 0, y: -17, "text-anchor": "middle", class: "packet-text" }, label));
  $("#packet-layer").append(group);
  return group;
}

function renderPackets() {
  $("#packet-layer").replaceChildren();
  packets = [];
  if (activeRoutes.length) {
    const count = currentStep().parallel ? activeRoutes.length : 1;
    for (let index = 0; index < count; index++) packets.push(makePacket(currentStep().packet));
    updatePackets();
  } else {
    const node = nodes[currentStep().nodes[0]];
    if (!node) throw new Error("A stationary step must identify a component.");
    const packet = makePacket(currentStep().packet);
    packet.setAttribute("transform", `translate(${node.x},${node.y - node.h / 2 - 7})`);
  }
}

function placePacket(packet, route, fraction) {
  const path = pathElements.get(route.id);
  const distance = path.getTotalLength() * (route.reverse ? 1 - fraction : fraction);
  const point = path.getPointAtLength(distance);
  packet.setAttribute("transform", `translate(${point.x},${point.y})`);
}

function updatePackets() {
  if (!activeRoutes.length) return;
  const fraction = state.motion ? state.progress : .5;
  if (currentStep().parallel) {
    activeRoutes.forEach((route, index) => placePacket(packets[index], route, fraction));
  } else {
    const travelled = fraction * activeRoutes.length;
    const index = Math.min(Math.floor(travelled), activeRoutes.length - 1);
    placePacket(packets[0], activeRoutes[index], travelled - index);
  }
}

function renderPlayback() {
  const playLabel = state.playing ? "Pause" : state.finished ? "Replay flow" : "Play flow";
  $("#play-button").innerHTML = `${icon(state.playing ? "pause" : "play")}<span>${playLabel}</span>`;
  $("#play-button").setAttribute("aria-label", `${playLabel}: ${currentScenario().title}`);
  $("#previous-button").disabled = state.step === 0;
  $("#next-button").disabled = state.step === currentScenario().steps.length - 1;
  $("#motion-button").textContent = state.motion ? "Motion on" : "Motion off";
  $("#motion-button").setAttribute("aria-pressed", String(state.motion));
}

function pause() {
  state.playing = false;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastFrameTime = null;
  renderPlayback();
}

function animate(now) {
  if (!state.playing) return;
  const elapsed = lastFrameTime === null ? 0 : now - lastFrameTime;
  lastFrameTime = now;
  state.progress = Math.min(1, state.progress + elapsed / (6000 / state.speed));
  updatePackets();
  if (state.progress >= 1) {
    if (state.step < currentScenario().steps.length - 1) {
      state.step++;
      state.progress = 0;
      renderStep();
    } else {
      state.finished = true;
      state.playing = false;
      frame = null;
      lastFrameTime = null;
      renderPlayback();
      $("#step-announcement").textContent = `${currentScenario().title} walkthrough complete. Select Replay flow to start again.`;
      return;
    }
  }
  frame = requestAnimationFrame(animate);
}

function play() {
  if (state.playing) { pause(); return; }
  if (state.finished) {
    state.step = 0;
    state.progress = 0;
    state.finished = false;
  }
  if (state.selectedNode) renderStep();
  else if (state.step === 0 && state.progress === 0) renderStep();
  state.playing = true;
  renderPlayback();
  lastFrameTime = null;
  frame = requestAnimationFrame(animate);
}

function seek(index) {
  if (!Number.isInteger(index) || index < 0 || index >= currentScenario().steps.length) {
    throw new RangeError(`Invalid walkthrough step: ${index}`);
  }
  pause();
  state.step = index;
  state.progress = 0;
  state.finished = false;
  renderStep();
}

function setView(view) {
  const allowed = ["traffic", "blueprint", "contracts", "publish", "value", "sources"];
  if (!allowed.includes(view)) throw new Error(`Unknown workspace view: ${view}`);
  if (state.view !== view) pause();
  state.view = view;
  for (const panel of document.querySelectorAll(".view")) panel.hidden = panel.id !== `view-${view}`;
  for (const button of document.querySelectorAll(".main-nav > button[data-view]")) {
    if (button.dataset.view === view) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  $(".flow-navigation").hidden = view !== "traffic";
}

function selectScenario(id) {
  if (!scenarios[id]) throw new Error(`Unknown scenario: ${id}`);
  pause();
  state.scenario = id;
  state.step = 0;
  state.progress = 0;
  state.finished = false;
  setView("traffic");
  renderScenario();
}

function inspectComponent(id) {
  const node = nodes[id];
  if (!node) throw new Error(`Unknown component: ${id}`);
  pause();
  state.selectedNode = id;
  $("#step-panel").hidden = true;
  $("#component-panel").hidden = false;
  $("#inspector-label").textContent = "Component inspector";
  $("#component-layer").textContent = node.layer;
  $("#component-title").textContent = node.title;
  $("#component-description").textContent = node.description;
  $("#component-facts").innerHTML = node.facts.map(fact => `<li>${escapeHTML(fact)}</li>`).join("");
  $("#component-value").textContent = node.value;
  sourceLink($("#component-source"), node.source);
  $("#step-announcement").textContent = `Inspecting ${node.title}. ${node.description}`;
  for (const [nodeId, group] of nodeElements) {
    group.classList.toggle("selected", nodeId === id);
    group.setAttribute("aria-pressed", String(nodeId === id));
  }
}

function renderLayer() {
  const layer = layers[state.layer];
  if (!$("#layer-selector").childElementCount) {
    $("#layer-selector").innerHTML = Object.keys(layers).map(id =>
      `<button data-layer="${id}" aria-label="Layer ${id}: ${escapeHTML(layers[id].title)}">L${id}</button>`
    ).join("");
  }
  for (const button of $("#layer-selector").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.layer === state.layer));
  }
  $("#layer-explanation").className = `layer-${state.layer}`;
  $("#layer-explanation").innerHTML = `<span class="layer-big-icon">${icon(layer.icon)}</span>
    <h3>Layer ${state.layer} · ${escapeHTML(layer.title)}</h3><p class="layer-intro">${escapeHTML(layer.description)}</p>
    <span class="layer-operation">${escapeHTML(layer.action)}</span>
    <ul class="layer-resources">${layer.resources.map(resource => `<li>${icon("check")}<span>${escapeHTML(resource)}</span></li>`).join("")}</ul>
    <p class="owner-line"><strong>Accountable ownership</strong>${escapeHTML(layer.owner)}</p>
    <a class="layer-source" href="${sources[layer.source].url}" target="_blank" rel="noopener noreferrer">Read the implementation guidance</a>`;
}

function renderContract(id) {
  const contract = contracts[id];
  if (!contract) throw new Error(`Unknown contract type: ${id}`);
  for (const button of document.querySelectorAll("[data-contract]")) {
    button.setAttribute("aria-pressed", String(button.dataset.contract === id));
  }
  const sampleLink = id === "access" || id === "publish"
    ? `<p><button class="text-button" data-view="${id === "access" ? "contracts" : "publish"}">Explore annotated ${id}-contract samples</button></p>` : "";
  $("#contract-explanation").innerHTML = `<div><h3>${escapeHTML(contract.title)}</h3><p>${escapeHTML(contract.description)}</p><p><strong>${escapeHTML(contract.distinction)}</strong></p><a class="layer-source" href="${sources[contract.source].url}" target="_blank" rel="noopener noreferrer">Contract guidance</a>${sampleLink}</div>
    <div class="contract-flow" aria-label="${escapeHTML(contract.from)} to ${escapeHTML(contract.to)}"><span>${escapeHTML(contract.from)}</span>${icon("arrow")}<span>${escapeHTML(contract.to)}</span></div>`;
}

function currentSampleFile(family) {
  const selection = state.samples[family];
  const file = sampleDefinitions[family].getExample(selection.example).files.find(item => item.id === selection.file);
  if (!file) throw new Error(`Unknown ${family} contract file: ${selection.file}`);
  return file;
}

function renderSampleScenarios(family) {
  const selection = state.samples[family];
  const container = $(`#${family}-scenarios`);
  if (!container.childElementCount) {
    container.innerHTML = Object.entries(sampleDefinitions[family].examples).map(([id, item]) =>
      `<button data-${family}-example="${id}" aria-pressed="false">${icon(item.icon)}<span>${escapeHTML(item.title)}<small>${item.code}</small></span></button>`
    ).join("");
  }
  for (const button of container.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset[`${family}Example`] === selection.example));
  }
}

function renderAccessExample() {
  const example = getAccessExample(state.samples.access.example);
  const hasAgent = example.assets.some(asset => asset.kind === "agent");
  renderSampleScenarios("access");
  $("#access-example-description").textContent = example.description;
  $("#access-product-id").textContent = example.productId;
  $("#access-enforcement").textContent = hasAgent ? "Per-asset gates; validate A2A preview" : example.code === "LLM" ? "Model access + token budgets" : "Endpoint access + request budgets";
  $("#access-preview-note").hidden = !hasAgent;
  $("#access-assets").innerHTML = example.assets.map(asset =>
    `<div><span>${escapeHTML(asset.label)}</span><code>${escapeHTML(asset.apiName)}</code></div>`
  ).join("");
  $("#access-key-secret").textContent = example.keySecretName;
  $("#access-secret-summary").textContent = `Key Vault receives one active-key secret and ${example.assets.length} endpoint secret${example.assets.length === 1 ? "" : "s"} for this subscription. Endpoint secrets contain gateway URLs, not the API resource names shown alongside.`;
  $("#access-watch-flow").dataset.scenario = example.flow;
  renderSampleFile("access");
}

function renderPublishExample() {
  const example = getPublishExample(state.samples.publish.example);
  renderSampleScenarios("publish");
  $("#publish-example-description").textContent = example.description;
  $("#publish-api-name").textContent = example.name;
  $("#publish-endpoint").textContent = example.endpoint;
  $("#publish-route-note").textContent = example.code === "mcp-from-api"
    ? "mcp/ prefix + path + APIM's /mcp suffix. Test a real tool invocation after configuring source-key forwarding."
    : example.code === "a2a"
      ? `Agent card: ${example.agentCard}. Confirm its transport URLs point back through the gateway.`
      : "mcp/ prefix + path. Do not append another /mcp to a native/remote MCP gateway URL.";
  $("#publish-resources").innerHTML = example.resources.map(([label, value]) =>
    `<div><span>${escapeHTML(label)}</span><code>${escapeHTML(value)}</code></div>`
  ).join("");
  $("#publish-access-mapping").textContent = `param apiNameMapping = {\n  ${example.code === "a2a" ? "AGENT" : "TOOL"}: [ ${example.accessApis.map(name => `'${name}'`).join(", ")} ]\n}`;
  $("#publish-access-note").textContent = example.code === "mcp-from-api"
    ? "Grant both APIs in the same access-contract product. Configure their tool classification consistently; this excerpt alone is not a complete access contract."
    : "Grant this API resource name, not the endpoint URL. Then configure the consumer subscription, roles and limits. A2A preview protection must be validated separately.";
  $("#publish-open-access").dataset.openAccess = example.accessExample;
  $("#publish-open-access").textContent = example.code === "mcp-from-api" ? "Open access pattern; adapt API names" : "Explore the matching access pattern";
  $("#publish-watch-flow").dataset.scenario = example.flow;
  $("#publish-warning").hidden = !example.warning;
  $("#publish-warning-text").textContent = example.warning;
  renderSampleFile("publish");
}

function renderSampleFile(family) {
  const file = currentSampleFile(family);
  const selection = state.samples[family];
  selection.section = file.sections[0].id;
  for (const button of document.querySelectorAll(`[data-${family}-file]`)) {
    button.setAttribute("aria-pressed", String(button.dataset[`${family}File`] === selection.file));
  }
  $(`#${family}-section`).innerHTML = file.sections.map(section =>
    `<option value="${section.id}">${escapeHTML(section.label)}</option>`
  ).join("");
  $(`#${family}-language`).textContent = file.language;
  $(`#${family}-code`).setAttribute("aria-label", `${sampleDefinitions[family].examples[selection.example].title}: ${file.name}. Highlighted lines match the selected section.`);
  let number = 0;
  const lines = [];
  for (const [index, section] of file.sections.entries()) {
    if (index) lines.push(`<span class="access-code-line"><span aria-hidden="true">${++number}</span><code></code></span>`);
    for (const line of section.code.split("\n")) {
      lines.push(`<span class="access-code-line" data-sample-section="${section.id}"><span aria-hidden="true">${++number}</span><code>${escapeHTML(line)}</code></span>`);
    }
  }
  if (file.ending) {
    lines.push(`<span class="access-code-line"><span aria-hidden="true">${++number}</span><code></code></span>`);
    for (const line of file.ending.split("\n")) {
      lines.push(`<span class="access-code-line"><span aria-hidden="true">${++number}</span><code>${escapeHTML(line)}</code></span>`);
    }
  }
  $(`#${family}-code`).innerHTML = lines.join("");
  $(`#${family}-code`).scrollTop = 0;
  $(`#${family}-copy-status`).textContent = "Sample only. No Azure resources are changed.";
  $(`#${family}-copy-status`).classList.remove("copy-error");
  renderSampleSection(family);
}

function renderSampleSection(family) {
  const file = currentSampleFile(family);
  const selection = state.samples[family];
  const section = file.sections.find(item => item.id === selection.section);
  if (!section) throw new Error(`Unknown contract section: ${selection.section}`);
  $(`#${family}-section`).value = section.id;
  $(`#${family}-field-title`).textContent = section.title;
  $(`#${family}-field-description`).textContent = section.description;
  $(`#${family}-inline-summary`).textContent = `${section.title}. ${section.description}`;
  $(`#${family}-field-effect`).textContent = section.effect;
  $(`#${family}-property-list`).innerHTML = section.properties.map(([name, type, description]) =>
    `<div><dt><code>${escapeHTML(name)}</code><span>${escapeHTML(type)}</span></dt><dd>${escapeHTML(description)}</dd></div>`
  ).join("");
  $(`#${family}-reference`).href = new URL(section.reference ?? file.reference, sources[family].url).href;
  for (const line of $(`#${family}-code`).querySelectorAll("[data-sample-section]")) {
    line.classList.toggle("selected", line.dataset.sampleSection === section.id);
  }
  const firstLine = $(`#${family}-code`).querySelector(".selected");
  if (firstLine) $(`#${family}-code`).scrollTop = Math.max(0, firstLine.offsetTop - 24);
  $(`#${family}-announcement`).textContent = `${sampleDefinitions[family].examples[selection.example].title}. ${file.name}. ${section.title}. ${section.effect}`;
}

async function copySampleFile(family) {
  const { text, name } = currentSampleFile(family);
  const title = sampleDefinitions[family].examples[state.samples[family].example].title;
  const status = $(`#${family}-copy-status`);
  if (!navigator.clipboard?.writeText) {
    status.textContent = "Clipboard unavailable. Select the code and copy it manually.";
    status.classList.add("copy-error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = `${name} copied (${title}). Replace placeholders before deploying.`;
    status.classList.remove("copy-error");
  } catch (error) {
    console.error("Could not copy the contract sample.", error);
    status.textContent = "Copy failed. Select the code and copy it manually.";
    status.classList.add("copy-error");
  }
}

function renderSources() {
  $("#source-grid").innerHTML = Object.values(sources).map(source =>
    `<article class="panel source-card"><span>${escapeHTML(source.publisher)}</span><h3>${escapeHTML(source.title)}</h3><p>${escapeHTML(source.description)}</p><a href="${source.url}" target="_blank" rel="noopener noreferrer">Open reference ${icon("external")}</a>${source.revision ? `<span class="revision">Pinned revision · ${source.revision.slice(0, 12)}</span>` : ""}</article>`
  ).join("");
}

document.addEventListener("click", event => {
  if (!(event.target instanceof Element)) return;
  const openAccess = event.target.closest("[data-open-access]");
  if (openAccess) {
    if (!Object.hasOwn(accessExamples, openAccess.dataset.openAccess)) throw new Error("Unknown access-contract scenario.");
    state.samples.access.example = openAccess.dataset.openAccess;
    renderAccessExample();
    setView("contracts");
    $(`[data-access-example="${state.samples.access.example}"]`).focus();
    window.scrollTo(0, 0);
    return;
  }
  for (const family of Object.keys(sampleDefinitions)) {
    const example = event.target.closest(`[data-${family}-example]`);
    if (example) {
      const id = example.dataset[`${family}Example`];
      if (!Object.hasOwn(sampleDefinitions[family].examples, id)) throw new Error(`Unknown ${family}-contract scenario.`);
      state.samples[family].example = id;
      if (family === "access") renderAccessExample();
      else renderPublishExample();
      return;
    }
    const file = event.target.closest(`[data-${family}-file]`);
    if (file) {
      state.samples[family].file = file.dataset[`${family}File`];
      renderSampleFile(family);
      return;
    }
  }
  const scenario = event.target.closest("[data-scenario]");
  if (scenario) { selectScenario(scenario.dataset.scenario); return; }
  const view = event.target.closest("[data-view]");
  if (view) { setView(view.dataset.view); window.scrollTo(0, 0); return; }
  const layer = event.target.closest("[data-layer]");
  if (layer) {
    if (!layers[layer.dataset.layer]) throw new Error("Unknown layer selection.");
    state.layer = layer.dataset.layer;
    renderLayer();
    setView("blueprint");
    return;
  }
  const contract = event.target.closest("[data-contract]");
  if (contract) { renderContract(contract.dataset.contract); return; }
  const step = event.target.closest("[data-step]");
  if (step) { seek(Number(step.dataset.step)); return; }
  const node = event.target.closest("[data-node]");
  if (node) inspectComponent(node.dataset.node);
});

$("#architecture").addEventListener("keydown", event => {
  if (!(event.target instanceof Element)) return;
  const node = event.target.closest("[data-node]");
  if (node && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    inspectComponent(node.dataset.node);
  }
});
$("#play-button").addEventListener("click", play);
$("#previous-button").addEventListener("click", () => seek(state.step - 1));
$("#next-button").addEventListener("click", () => seek(state.step + 1));
$("#restart-button").addEventListener("click", () => seek(0));
$("#step-range").addEventListener("input", event => seek(Number(event.target.value)));
$("#return-to-flow").addEventListener("click", () => renderStep());
for (const family of Object.keys(sampleDefinitions)) {
  $(`#${family}-section`).addEventListener("change", event => {
    state.samples[family].section = event.target.value;
    renderSampleSection(family);
  });
  $(`#${family}-copy`).addEventListener("click", () => copySampleFile(family));
}
$("#network-mode").addEventListener("change", event => {
  const mode = event.target.value;
  if (!networkModes[mode]) throw new Error(`Unknown network layout: ${mode}`);
  pause();
  state.network = mode;
  state.progress = 0;
  state.finished = false;
  renderNetwork();
  renderStep();
});
$("#show-network").addEventListener("change", event => {
  $("#architecture").classList.toggle("no-boundaries", !event.target.checked);
});
$("#zoom").addEventListener("change", event => {
  $("#architecture").style.width = `${Number(event.target.value) * 100}%`;
});
$("#speed").addEventListener("change", event => { state.speed = Number(event.target.value); });
$("#motion-button").addEventListener("click", () => {
  state.motionOverride = true;
  state.motion = !state.motion;
  renderPlayback();
  updatePackets();
});
reducedMotion.addEventListener("change", event => {
  if (state.motionOverride) return;
  state.motion = !event.matches;
  renderPlayback();
  updatePackets();
});
$("#theme-button").addEventListener("click", () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
});
document.addEventListener("visibilitychange", () => { if (document.hidden && state.playing) pause(); });
document.addEventListener("keydown", event => {
  if (state.view !== "traffic" || event.altKey || event.ctrlKey || event.metaKey) return;
  if (!(event.target instanceof Element) || event.target.closest("button, a, input, select, [role='button']")) return;
  if (event.target.closest(".diagram-scroll")) return;
  if (event.key === " ") { event.preventDefault(); play(); }
  if (event.key === "ArrowRight" && state.step < currentScenario().steps.length - 1) { event.preventDefault(); seek(state.step + 1); }
  if (event.key === "ArrowLeft" && state.step > 0) { event.preventDefault(); seek(state.step - 1); }
});

renderMap();
renderScenario();
renderLayer();
renderContract("backend");
renderAccessExample();
renderPublishExample();
renderSources();
