const dom = {
  hierarchyColumns: document.getElementById("hierarchyColumns"),
  hierarchyPanel: document.querySelector(".hierarchy-panel"),
  eventFeed: document.getElementById("eventFeed"),
  selectedNode: document.getElementById("selectedNode"),
  kingdomStats: document.getElementById("kingdomStats"),
  detailsPanel: document.getElementById("detailsPanel"),
  eventButton: document.getElementById("eventButton"),
  discoverButton: document.getElementById("discoverButton"),
  scoutButton: document.getElementById("scoutButton"),
  rewireForm: document.getElementById("rewireForm"),
  rewireNode: document.getElementById("rewireNode"),
  rewireParent: document.getElementById("rewireParent"),
  connectionForm: document.getElementById("connectionForm"),
  connectionSource: document.getElementById("connectionSource"),
  connectionTarget: document.getElementById("connectionTarget"),
  connectionType: document.getElementById("connectionType"),
  connectionSecrecy: document.getElementById("connectionSecrecy"),
  connectionStatusHint: document.getElementById("connectionStatusHint"),
  connectionList: document.getElementById("connectionList"),
};

const state = {
  nodes: new Map(),
  selectedNodeId: null,
  eventFeed: [],
  scoutCounter: 0,
  connections: new Map(),
  turn: 1,
  connectionsUsedThisTurn: 0,
};

const BASE_NODES = [
  {
    id: "aster",
    name: "Aster the Radiant",
    role: "Solar Regent",
    parentId: null,
    influence: 94,
    mood: "Resolute",
    attributes: [
      { name: "Legitimacy", value: "Solar bloodline intact", known: true },
      {
        name: "Public Favor",
        value: "Wavering after the eclipsed coronation",
        known: false,
        clue: "Crowds whisper that the sun dimmed on purpose.",
      },
      {
        name: "Secret Design",
        value: "Plans to tether storms to palace mirrors",
        known: false,
        clue: "Unusual requisitions for stormglass panels.",
      },
    ],
    log: ["Pronounced a season of cautious expansion."],
  },
  {
    id: "cassian",
    name: "Cassian Mire",
    role: "Veiled Spymaster",
    parentId: "aster",
    influence: 74,
    mood: "Watchful",
    attributes: [
      {
        name: "Network",
        value: "Agents nested in every merchant guild",
        known: true,
      },
      {
        name: "Buried Loyalty",
        value: "Bound to the Regent by blood-debt",
        known: false,
        clue: "Keeps a crimson promissory hidden in sleeve.",
      },
      {
        name: "True Ambition",
        value: "Seeks to rewrite the code of succession",
        known: false,
        clue: "Studies archaic parliamentary scrolls nightly.",
      },
    ],
    log: ["Ashen ink memo warned of dissent in the river houses."],
  },
  {
    id: "lyra",
    name: "Lyra Thorn",
    role: "Shield-Captain",
    parentId: "aster",
    influence: 68,
    mood: "Steady",
    attributes: [
      {
        name: "Discipline",
        value: "Keeps the Dawn Guard marching at dawn and dusk",
        known: true,
      },
      {
        name: "Private Doubt",
        value: "Questions the Regent's reliance on omens",
        known: false,
        clue: "Has the augury tent sealed whenever possible.",
      },
    ],
    log: ["Rotated marsh sentries closer to the inner gates."],
  },
  {
    id: "marin",
    name: "Marin Vale",
    role: "Archivist of Echoes",
    parentId: "cassian",
    influence: 52,
    mood: "Curious",
    attributes: [
      {
        name: "Memory Craft",
        value: "Can replay any council session verbatim",
        known: true,
      },
      {
        name: "Forbidden Volume",
        value: "Guards a tome on binding ancestral spirits",
        known: false,
        clue: "Keeps a shelf slot empty yet dustless.",
      },
    ],
    log: ["Filed an encoded report on stormglass requisitions."],
  },
  {
    id: "elana",
    name: "Elana Rook",
    role: "Quartermistress",
    parentId: "lyra",
    influence: 48,
    mood: "Burdened",
    attributes: [
      {
        name: "Stash",
        value: "Emergency granaries hidden below the river stairs",
        known: false,
        clue: "Keeps keys carved from riverbone.",
      },
      {
        name: "Temper",
        value: "Snaps whenever diplomacy stalls",
        known: true,
      },
    ],
    log: ["Moved surplus iron to the frontier for repairs."],
  },
  {
    id: "sable",
    name: "Sable Lune",
    role: "Whisperbroker",
    parentId: "cassian",
    influence: 57,
    mood: "Playful",
    attributes: [
      {
        name: "Mask Collection",
        value: "Owns a persona for every noble house",
        known: true,
      },
      {
        name: "Hidden Pact",
        value: "Maintains a backchannel with the river pirates",
        known: false,
        clue: "Fresh river scrip tucked in her correspondence.",
      },
    ],
    log: ["Slipped a rumor about the Regent's sleepless nights."],
  },
];

const EVENTS = [
  {
    id: "harvest",
    label: "Harvest Collapse",
    prompt:
      "Storms flatten the midlands. Storehouses needs triage and the people demand clarity.",
    resolve: (ctx) => {
      const quartermaster = findByRole("Quartermistress");
      const regent = pickTier(0)[0];
      const stewardScore =
        (quartermaster?.influence ?? 30) +
        knownAttributeCount(quartermaster) * 5;
      const difficulty = 65 - (regent ? regent.influence / 10 : 0);
      const success = stewardScore + randomRange(-10, 10) >= difficulty;
      const summary = success
        ? `${quartermaster?.name ?? "No steward"} stabilizes bread lines, but whispers grow about ration markers.`
        : `Supplies buckle; mobs chant beneath the keep until ${regent?.name ?? "the throne"} addresses them.`;
      const adjustments = [];
      if (quartermaster) {
        adjustments.push({ id: quartermaster.id, delta: success ? 6 : -8 });
      }
      if (regent) {
        adjustments.push({ id: regent.id, delta: success ? -2 : -5 });
      }
      const logs = [];
      if (quartermaster) {
        logs.push({
          id: quartermaster.id,
          entry: success
            ? "Diverted hidden grain caches to calm the famine."
            : "Lost track of grain ledgers; the court saw panic flicker.",
        });
      }
      if (regent) {
        logs.push({
          id: regent.id,
          entry: success
            ? "Praised measured rationing; promised brighter harvests."
            : "Forced to descend to the plaza and quell the crowds.",
        });
      }
      return { summary, adjustments, logs, discoveryChance: success ? 0.25 : 0.4 };
    },
  },
  {
    id: "border",
    label: "Border Sparks",
    prompt:
      "Signal pyres flash across the northern ridge. Patrols demand reinforcement and a clearer pecking order.",
    resolve: () => {
      const captain = findByRole("Shield-Captain");
      const spymaster = findByRole("Veiled Spymaster");
      const martialScore =
        (captain?.influence ?? 40) + knownAttributeCount(captain) * 4;
      const intrigueScore =
        (spymaster?.influence ?? 45) + knownAttributeCount(spymaster) * 3;
      const tension = martialScore - intrigueScore + randomRange(-12, 12);
      const summary =
        tension > 0
          ? `${captain?.name ?? "The guard"} seizes command, sidelining informants.`
          : `${spymaster?.name ?? "Shadow agents"} claim the ridge, turning scouts into spies.`;
      const adjustments = [];
      if (captain) adjustments.push({ id: captain.id, delta: tension > 0 ? 7 : -4 });
      if (spymaster)
        adjustments.push({ id: spymaster.id, delta: tension > 0 ? -3 : 6 });
      const logs = [];
      if (captain) {
        logs.push({
          id: captain.id,
          entry:
            tension > 0
              ? "Posted fresh standards on the ridge, daring the border clans."
              : "Forced to wait while spies sifted every ember and rumor.",
        });
      }
      if (spymaster) {
        logs.push({
          id: spymaster.id,
          entry:
            tension > 0
              ? "Growled about blunt swords meddling in subtle games."
              : "Expanded listening posts and bound the ridge chiefs with secrets.",
        });
      }
      return { summary, adjustments, logs, discoveryChance: 0.2 };
    },
  },
  {
    id: "cult",
    label: "Veil Cult Emerges",
    prompt:
      "A dream cult promises unity under a masked oracle. The court must decide whether to crush or court it.",
    resolve: () => {
      const whisper = findByRole("Whisperbroker");
      const archivist = findByRole("Archivist of Echoes");
      const mystics = [whisper, archivist].filter(Boolean);
      const leverage =
        mystics.reduce((sum, node) => sum + node.influence, 0) /
        Math.max(1, mystics.length);
      const reveal = leverage + randomRange(-15, 15) > 55;
      const summary = reveal
        ? `${whisper?.name ?? "Silver tongues"} steer the cult into loyal pageantry.`
        : `Ritual fires spread; the court suspects a traitor hides among records.`;
      const logs = [];
      mystics.forEach((node) => {
        logs.push({
          id: node.id,
          entry: reveal
            ? "Turned the cult's chants into praises of the throne."
            : "Failed to predict the oracle's rise; scrutiny intensifies.",
        });
      });
      const adjustments = mystics.map((node) => ({
        id: node.id,
        delta: reveal ? 5 : -6,
      }));
      return { summary, logs, adjustments, discoveryChance: reveal ? 0.35 : 0.5 };
    },
  },
];

const CONNECTION_TYPES = [
  {
    id: "oath",
    label: "Oathbond",
    description: "Mutual duty reinforced under the Crown.",
    color: "#f6c177",
    unlockHint: "Pairs of oathbonds can expose buried loyalties.",
  },
  {
    id: "leverage",
    label: "Leverage Chain",
    description: "Favours, debts, and political leverage.",
    color: "#a5b4ff",
    unlockHint: "Secret leverage creates influence surges.",
  },
  {
    id: "whisper",
    label: "Whisper Thread",
    description: "Shared informants and rumor trades.",
    color: "#9ef0d8",
    unlockHint: "Three whisper threads may trigger intel boons.",
  },
];

const CONNECTION_TYPE_MAP = new Map(CONNECTION_TYPES.map((type) => [type.id, type]));
const MAX_CONNECTIONS_PER_TURN = 1;
let overlayAgent = null;

const NAME_PARTS = {
  first: ["Iria", "Balen", "Corvus", "Neris", "Thane", "Sera", "Orrin", "Vela"],
  second: ["Vale", "Kerr", "Nyx", "Dawn", "Kestrel", "Rune", "Marrow", "Sol"],
  roles: [
    "Ember Cartographer",
    "River Herald",
    "Diplomatic Envoy",
    "Siege Artificer",
    "Echo Singer",
    "Sky Warden",
  ],
  traits: [
    { name: "Motivation", clue: "Keeps rewriting their oath draft." },
    { name: "Debt", clue: "Merchants grin when this one enters." },
    { name: "Night Habit", clue: "Lantern always lit past moonset." },
    { name: "Forbidden Mentor", clue: "Corresponds with a disgraced general." },
  ],
};

function init() {
  BASE_NODES.forEach((node) => {
    const clone = JSON.parse(JSON.stringify(node));
    state.nodes.set(node.id, {
      ...clone,
      log: [...(clone.log ?? [])],
    });
  });
  state.selectedNodeId = "aster";
  wireControls();
  overlayAgent = new ConnectionOverlayAgent(dom.hierarchyPanel);
  overlayAgent.init();
  renderAll();
}

function wireControls() {
  dom.eventButton.addEventListener("click", triggerEvent);
  dom.discoverButton.addEventListener("click", discoverTrait);
  dom.scoutButton.addEventListener("click", scoutNewNode);
  dom.rewireForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleRewire();
  });
  dom.rewireNode.addEventListener("change", () => {
    populateParentOptions(dom.rewireNode.value);
  });
  dom.connectionForm.addEventListener("submit", handleConnectionSubmit);
}

function renderAll() {
  renderHierarchy();
  syncOverlayAgent();
  renderSelected();
  renderEventFeed();
  renderStats();
  renderRewireOptions();
  renderConnectionControls();
  renderConnectionLedger();
}

function renderHierarchy() {
  const columns = new Map();
  state.nodes.forEach((node) => {
    const tier = getTier(node.id);
    if (!columns.has(tier)) columns.set(tier, []);
    columns.get(tier).push(node);
  });
  const sortedTiers = [...columns.keys()].sort((a, b) => a - b);
  dom.hierarchyColumns.innerHTML = "";
  sortedTiers.forEach((tier) => {
    const tierEl = document.createElement("div");
    tierEl.className = "tier-column";
    const title = document.createElement("h4");
    title.textContent = tier === 0 ? "Crown" : `Tier ${tier}`;
    tierEl.appendChild(title);
    const nodes = columns.get(tier).sort((a, b) => b.influence - a.influence);
    nodes.forEach((node) => {
      const card = document.createElement("article");
      card.className = "node-card";
      card.dataset.nodeId = node.id;
      if (node.id === state.selectedNodeId) card.classList.add("selected");
      card.innerHTML = `
        <header>
          <span>${node.name}</span>
          <span>${node.influence}</span>
        </header>
        <div class="node-role">${node.role}</div>
        <div class="badge-row">
          <span class="badge">Mood: ${node.mood}</span>
          ${
            unknownAttributeCount(node) > 0
              ? `<span class="badge unknown">? x${unknownAttributeCount(node)}</span>`
              : ""
          }
        </div>
      `;
      card.addEventListener("click", () => selectNode(node.id));
      tierEl.appendChild(card);
    });
    dom.hierarchyColumns.appendChild(tierEl);
  });
}

function syncOverlayAgent() {
  if (!overlayAgent) return;
  overlayAgent.update([...state.connections.values()]);
}

function renderSelected() {
  const node = state.nodes.get(state.selectedNodeId);
  if (!node) {
    dom.selectedNode.innerHTML =
      '<p class="empty-state">Select any node to study their dossier.</p>';
    return;
  }
  const details = document.createElement("div");
  details.className = "details-card";
  const attributes = node.attributes
    .map(
      (attr) => `
    <div class="attribute ${attr.known ? "" : "unknown"}">
      <span class="label">${attr.name}</span>
      <span>${attr.known ? attr.value : attr.clue ?? "Unknown"}</span>
    </div>
  `
    )
    .join("");
  const logs =
    node.log.length === 0
      ? '<div class="empty-state">No notable entries yet.</div>'
      : node.log
          .slice(-6)
          .reverse()
          .map((entry) => `<div>• ${entry}</div>`)
          .join("");
  details.innerHTML = `
    <header>
      <div>
        <h3>${node.name}</h3>
        <p>${node.role}</p>
      </div>
      <div class="badge">Influence ${node.influence}</div>
    </header>
    <div class="attribute-list">
      ${attributes}
    </div>
    <div class="log-list">
      ${logs}
    </div>
  `;
  dom.selectedNode.innerHTML = "";
  dom.selectedNode.appendChild(details);
}

function renderEventFeed() {
  if (state.eventFeed.length === 0) {
    dom.eventFeed.innerHTML =
      '<p class="empty-state">No major events have rippled through yet.</p>';
    return;
  }
  dom.eventFeed.innerHTML = state.eventFeed
    .map(
      (event) => `
      <div class="event-item">
        <strong>${event.summary}</strong>
        <time>${event.timestamp}</time>
      </div>
    `
    )
    .join("");
}

function renderStats() {
  const totalAttrs = [...state.nodes.values()].reduce(
    (acc, node) => acc + node.attributes.length,
    0
  );
  const knownAttrs = [...state.nodes.values()].reduce(
    (acc, node) => acc + knownAttributeCount(node),
    0
  );
  const insight = totalAttrs ? Math.round((knownAttrs / totalAttrs) * 100) : 40;
  const influences = [...state.nodes.values()]
    .map((node) => node.influence)
    .sort((a, b) => b - a);
  const stability = Math.round(
    influences.slice(0, 4).reduce((sum, val) => sum + val, 0) /
      Math.max(1, influences.slice(0, 4).length)
  );
  const mystery = 100 - insight;
  const bondTokens = Math.max(0, MAX_CONNECTIONS_PER_TURN - state.connectionsUsedThisTurn);
  dom.kingdomStats.innerHTML = `
    <div class="stat-chip">Turn ${state.turn}</div>
    <div class="stat-chip">Stability ${stability}</div>
    <div class="stat-chip">Insight ${insight}%</div>
    <div class="stat-chip">Mystery ${mystery}%</div>
    <div class="stat-chip">Nodes ${state.nodes.size}</div>
    <div class="stat-chip">Bond ${bondTokens}/${MAX_CONNECTIONS_PER_TURN}</div>
  `;
}

function renderRewireOptions() {
  const options = [...state.nodes.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  dom.rewireNode.innerHTML =
    '<option value="">Select a node</option>' +
    options.map((node) => `<option value="${node.id}">${node.name}</option>`).join("");
  populateParentOptions(dom.rewireNode.value || "");
}

function populateParentOptions(nodeId) {
  const node = nodeId ? state.nodes.get(nodeId) : null;
  const blocked = node ? new Set([node.id, ...getDescendants(node.id)]) : new Set();
  const parentOptions = [...state.nodes.values()]
    .filter((candidate) => !blocked.has(candidate.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (candidate) =>
        `<option value="${candidate.id}" ${
          node && candidate.id === node.parentId ? "selected" : ""
        }>${candidate.name}</option>`
    )
    .join("");
  dom.rewireParent.innerHTML = `
    <option value="" ${node && !node.parentId ? "selected" : ""}>Crown (Top Level)</option>
    ${parentOptions}
  `;
}

function handleRewire() {
  const nodeId = dom.rewireNode.value;
  if (!nodeId) {
    alert("Select which node to move.");
    return;
  }
  const parentId = dom.rewireParent.value || null;
  const node = state.nodes.get(nodeId);
  if (!node) return;
  if (parentId === nodeId) {
    alert("A node cannot report to itself.");
    return;
  }
  if (parentId && getDescendants(nodeId).includes(parentId)) {
    alert("Cannot assign a descendant as the parent.");
    return;
  }
  node.parentId = parentId;
  addLog(
    node.id,
    parentId
      ? `Now reports to ${state.nodes.get(parentId)?.name ?? "unknown"}`
      : "Raised directly beneath the Crown."
  );
  pushEvent(`${node.name} shifted within the hierarchy.`);
  renderAll();
}

function renderConnectionControls() {
  if (!dom.connectionSource || !dom.connectionTarget || !dom.connectionType) return;
  const nodes = [...state.nodes.values()].sort((a, b) => a.name.localeCompare(b.name));
  const previousSource = dom.connectionSource.value;
  const previousTarget = dom.connectionTarget.value;
  const previousType = dom.connectionType.value || "";
  const options = nodes
    .map((node) => `<option value="${node.id}">${node.name}</option>`)
    .join("");
  dom.connectionSource.innerHTML = `<option value="">Select source</option>${options}`;
  dom.connectionTarget.innerHTML = `<option value="">Select target</option>${options}`;
  if (nodes.some((node) => node.id === previousSource)) {
    dom.connectionSource.value = previousSource;
  }
  if (nodes.some((node) => node.id === previousTarget)) {
    dom.connectionTarget.value = previousTarget;
  }
  const selectedType = CONNECTION_TYPES.some((type) => type.id === previousType)
    ? previousType
    : CONNECTION_TYPES[0]?.id ?? "";
  dom.connectionType.innerHTML = CONNECTION_TYPES.map(
    (type) => `<option value="${type.id}" ${type.id === selectedType ? "selected" : ""}>${type.label}</option>`
  ).join("");
  if (!CONNECTION_TYPES.find((type) => type.id === dom.connectionType.value) && CONNECTION_TYPES[0]) {
    dom.connectionType.value = CONNECTION_TYPES[0].id;
  }
  updateConnectionStatusHint();
}

function renderConnectionLedger() {
  if (!dom.connectionList) return;
  if (state.connections.size === 0) {
    dom.connectionList.innerHTML =
      '<p class="empty-state">No personal bonds have been recorded yet.</p>';
    return;
  }
  const entries = [...state.connections.values()]
    .sort((a, b) => b.createdTurn - a.createdTurn)
    .map((connection) => {
      const source = state.nodes.get(connection.sourceId);
      const target = state.nodes.get(connection.targetId);
      const type = CONNECTION_TYPE_MAP.get(connection.type);
      const unlocks =
        connection.unlocks && connection.unlocks.length > 0
          ? connection.unlocks.map((note) => `<div class="unlock-note">${note}</div>`).join("")
          : type?.unlockHint
          ? `<div class="unlock-note">${type.unlockHint}</div>`
          : "";
      return `
        <article class="connection-chip">
          <header>
            <span>${source?.name ?? "Unknown"} ↔ ${target?.name ?? "Unknown"}</span>
            <span>${type?.label ?? connection.type}</span>
          </header>
          <div class="meta">
            <span>${connection.secrecy === "secret" ? "Secret Compact" : "Public Ledger"}</span>
            <span>Intensity ${connection.intensity}</span>
            <span>Turn ${connection.createdTurn}</span>
          </div>
          <p>${type?.description ?? ""}</p>
          ${unlocks}
        </article>
      `;
    })
    .join("");
  dom.connectionList.innerHTML = entries;
}

function updateConnectionStatusHint() {
  if (!dom.connectionStatusHint) return;
  const remaining = Math.max(0, MAX_CONNECTIONS_PER_TURN - state.connectionsUsedThisTurn);
  dom.connectionStatusHint.textContent =
    remaining > 0
      ? `Bond token ready: ${remaining} of ${MAX_CONNECTIONS_PER_TURN} available this turn.`
      : "Bond token spent. Advance the turn to unlock another forging.";
}

function handleConnectionSubmit(event) {
  event.preventDefault();
  if (!canForgeConnection()) {
    alert("Bond token spent. Resolve another turn action to refresh it.");
    return;
  }
  const sourceId = dom.connectionSource.value;
  const targetId = dom.connectionTarget.value;
  const typeId = dom.connectionType.value || CONNECTION_TYPES[0]?.id;
  const secrecy = dom.connectionSecrecy.value;
  if (!sourceId || !targetId) {
    alert("Select both source and target nodes.");
    return;
  }
  if (sourceId === targetId) {
    alert("A node cannot bind to itself.");
    return;
  }
  if (connectionExists(sourceId, targetId)) {
    alert("Those nodes already have a recorded bond.");
    return;
  }
  forgeConnection({ sourceId, targetId, typeId, secrecy });
  renderAll();
}

function canForgeConnection() {
  return state.connectionsUsedThisTurn < MAX_CONNECTIONS_PER_TURN;
}

function connectionExists(sourceId, targetId) {
  for (const connection of state.connections.values()) {
    const matchesDirect =
      (connection.sourceId === sourceId && connection.targetId === targetId) ||
      (connection.sourceId === targetId && connection.targetId === sourceId);
    if (matchesDirect) return true;
  }
  return false;
}

function forgeConnection({ sourceId, targetId, typeId, secrecy }) {
  const source = state.nodes.get(sourceId);
  const target = state.nodes.get(targetId);
  if (!source || !target) {
    alert("One of the selected nodes no longer exists.");
    return null;
  }
  const type = CONNECTION_TYPE_MAP.get(typeId) ?? CONNECTION_TYPES[0];
  const connection = {
    id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sourceId,
    targetId,
    type: type?.id ?? typeId,
    secrecy,
    intensity: randomRange(40, 80),
    createdTurn: state.turn,
    unlocks: [],
  };
  state.connections.set(connection.id, connection);
  state.connectionsUsedThisTurn += 1;
  pushEvent(
    `${type?.label ?? "Bond"} forged between ${source.name} and ${target.name}.`
  );
  addLog(
    sourceId,
    `Forged a ${type?.label ?? "connection"} with ${target.name} (${secrecy}).`
  );
  addLog(
    targetId,
    `Forged a ${type?.label ?? "connection"} with ${source.name} (${secrecy}).`
  );
  evaluateConnectionUnlocks(connection);
  updateConnectionStatusHint();
  return connection;
}

function getConnectionsForNode(nodeId) {
  return [...state.connections.values()].filter(
    (connection) =>
      connection.sourceId === nodeId || connection.targetId === nodeId
  );
}

function evaluateConnectionUnlocks(connection) {
  const impactedNodes = [connection.sourceId, connection.targetId];
  impactedNodes.forEach((nodeId) => {
    const node = state.nodes.get(nodeId);
    if (!node) return;
    const personalConnections = getConnectionsForNode(nodeId);
    const typeCounts = personalConnections.reduce((acc, conn) => {
      acc[conn.type] = (acc[conn.type] || 0) + 1;
      return acc;
    }, {});
    if ((typeCounts.oath ?? 0) >= 2) {
      if (revealTraitForNode(nodeId, "Oath web exposes a buried truth")) {
        connection.unlocks.push(`${node.name} reveals a buried truth.`);
      }
    }
    if ((typeCounts.whisper ?? 0) >= 3) {
      addLog(nodeId, "Whisper network feeds strategic foresight.");
      adjustInfluence(nodeId, 4);
      connection.unlocks.push(`${node.name} gains foresight from whispers.`);
    }
    const secretLinks = personalConnections.filter(
      (conn) => conn.secrecy === "secret"
    ).length;
    if (secretLinks >= 2) {
      addLog(nodeId, "Secret compacts strain loyalties; influence dips.");
      adjustInfluence(nodeId, -2);
    }
  });
}

function revealTraitForNode(nodeId, reason) {
  const node = state.nodes.get(nodeId);
  if (!node) return false;
  const hidden = node.attributes.filter((attr) => !attr.known);
  if (hidden.length === 0) return false;
  const attr = randomItem(hidden);
  attr.known = true;
  addLog(nodeId, `${reason}: ${attr.name} — ${attr.value}.`);
  pushEvent(`${node.name}'s ${attr.name} surfaces through new bonds.`);
  return true;
}

function advanceTurn(note) {
  state.turn += 1;
  state.connectionsUsedThisTurn = 0;
  state.lastTurnNote = note;
  updateConnectionStatusHint();
}

function triggerEvent() {
  const event = randomItem(EVENTS);
  if (!event) return;
  const outcome = event.resolve(state);
  pushEvent(`${event.label}: ${outcome.summary}`);
  (outcome.logs ?? []).forEach(({ id, entry }) => addLog(id, entry));
  (outcome.adjustments ?? []).forEach(({ id, delta }) => adjustInfluence(id, delta));
  if (Math.random() < (outcome.discoveryChance ?? 0)) {
    revealRandomTrait();
  }
  advanceTurn("Event resolved");
  renderAll();
}

function discoverTrait() {
  const revealed = revealRandomTrait();
  if (!revealed) {
    pushEvent("All known figures stand exposed; no mysteries left to uncover.");
  }
  advanceTurn("Insight focus spent");
  renderAll();
}

function scoutNewNode() {
  const name = `${randomItem(NAME_PARTS.first)} ${randomItem(NAME_PARTS.second)}`;
  const role = randomItem(NAME_PARTS.roles);
  const traitTemplate = randomItem(NAME_PARTS.traits);
  const newId = `scout-${state.scoutCounter++}`;
  const parentCandidates = [...state.nodes.values()].filter(
    (node) => getTier(node.id) <= 2
  );
  const parent = randomItem(parentCandidates) ?? [...state.nodes.values()][0];
  const node = {
    id: newId,
    name,
    role,
    parentId: parent?.id ?? null,
    influence: randomRange(35, 60),
    mood: randomItem(["Eager", "Unsettled", "Hopeful", "Guarded"]),
    attributes: [
      {
        name: "First Impression",
        value: randomItem([
          "Spoke poetry to the regent",
          "Displayed a tactical map etched on glass",
          "Brought cinnamon flamewine tribute",
        ]),
        known: true,
      },
      {
        name: traitTemplate.name,
        value: `Secret: ${traitTemplate.clue}`,
        known: false,
        clue: traitTemplate.clue,
      },
    ],
    log: [`Introduced as ${role} allied to ${parent?.name ?? "no patron"}.`],
  };
  state.nodes.set(node.id, node);
  state.selectedNodeId = node.id;
  pushEvent(`A new figure emerges: ${node.name}, the ${node.role}.`);
  advanceTurn("New envoy scouted");
  renderAll();
}

function revealRandomTrait() {
  const pool = [];
  state.nodes.forEach((node) => {
    node.attributes.forEach((attr) => {
      if (!attr.known) pool.push({ node, attr });
    });
  });
  if (pool.length === 0) return false;
  const { node, attr } = randomItem(pool);
  attr.known = true;
  addLog(node.id, `Revealed: ${attr.name} — ${attr.value}.`);
  pushEvent(`${node.name}'s ${attr.name} is now understood.`);
  return true;
}

function selectNode(nodeId) {
  state.selectedNodeId = nodeId;
  renderSelected();
  renderHierarchy();
}

function pushEvent(summary) {
  state.eventFeed.unshift({
    summary,
    timestamp: new Date().toLocaleTimeString(),
  });
  state.eventFeed = state.eventFeed.slice(0, 8);
  renderEventFeed();
}

function addLog(nodeId, entry) {
  const node = state.nodes.get(nodeId);
  if (!node) return;
  node.log.push(entry);
  node.log = node.log.slice(-12);
  if (nodeId === state.selectedNodeId) {
    renderSelected();
  }
}

function adjustInfluence(nodeId, delta) {
  const node = state.nodes.get(nodeId);
  if (!node) return;
  node.influence = clamp(node.influence + delta, 20, 100);
}

function getTier(nodeId, memo = new Map()) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  const node = state.nodes.get(nodeId);
  if (!node || !node.parentId) {
    memo.set(nodeId, 0);
    return 0;
  }
  const tier = 1 + getTier(node.parentId, memo);
  memo.set(nodeId, tier);
  return tier;
}

function pickTier(tier) {
  return [...state.nodes.values()].filter((node) => getTier(node.id) === tier);
}

function findByRole(roleFragment) {
  return [...state.nodes.values()].find((node) =>
    node.role.toLowerCase().includes(roleFragment.toLowerCase())
  );
}

function randomItem(list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function knownAttributeCount(node) {
  if (!node) return 0;
  return node.attributes.filter((attr) => attr.known).length;
}

function unknownAttributeCount(node) {
  if (!node) return 0;
  return node.attributes.filter((attr) => !attr.known).length;
}

function getDescendants(nodeId) {
  const descendants = [];
  state.nodes.forEach((node) => {
    if (node.parentId === nodeId) {
      descendants.push(node.id, ...getDescendants(node.id));
    }
  });
  return descendants;
}

class ConnectionOverlayAgent {
  constructor(hostElement) {
    this.host = hostElement;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "connection-overlay";
    this.ctx = this.canvas.getContext("2d");
    this.connections = [];
    this.frame = null;
    this.handleResize = this.requestDraw.bind(this);
  }

  init() {
    if (!this.host) return;
    this.host.appendChild(this.canvas);
    window.addEventListener("resize", this.handleResize);
    this.requestDraw();
  }

  update(connections) {
    this.connections = connections;
    this.requestDraw();
  }

  requestDraw() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.draw());
  }

  resizeCanvas() {
    if (!this.host) return;
    const rect = this.host.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  draw() {
    if (!this.host) return;
    this.resizeCanvas();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.connections.forEach((connection) => {
      const startEl = this.host.querySelector(`[data-node-id="${connection.sourceId}"]`);
      const endEl = this.host.querySelector(`[data-node-id="${connection.targetId}"]`);
      if (!startEl || !endEl) return;
      const start = this.getCenter(startEl);
      const end = this.getCenter(endEl);
      const type = CONNECTION_TYPE_MAP.get(connection.type);
      const color = type?.color ?? "#ffffff";
      ctx.strokeStyle = color;
      ctx.globalAlpha = connection.secrecy === "secret" ? 0.9 : 0.6;
      ctx.lineWidth = connection.secrecy === "secret" ? 2.4 : 1.6;
      ctx.beginPath();
      const midX = (start.x + end.x) / 2;
      const curvature = connection.secrecy === "secret" ? 60 : 40;
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(midX, start.y - curvature, midX, end.y + curvature, end.x, end.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  getCenter(element) {
    const hostRect = this.host.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - hostRect.left + rect.width / 2,
      y: rect.top - hostRect.top + rect.height / 2,
    };
  }
}

init();
