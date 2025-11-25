const dom = {
  hierarchyColumns: document.getElementById("hierarchyColumns"),
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
};

const state = {
  nodes: new Map(),
  selectedNodeId: null,
  eventFeed: [],
  scoutCounter: 0,
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
}

function renderAll() {
  renderHierarchy();
  renderSelected();
  renderEventFeed();
  renderStats();
  renderRewireOptions();
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
  dom.kingdomStats.innerHTML = `
    <div class="stat-chip">Stability ${stability}</div>
    <div class="stat-chip">Insight ${insight}%</div>
    <div class="stat-chip">Mystery ${mystery}%</div>
    <div class="stat-chip">Nodes ${state.nodes.size}</div>
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
  renderAll();
}

function discoverTrait() {
  if (!revealRandomTrait()) {
    pushEvent("All known figures stand exposed; no mysteries left to uncover.");
  } else {
    renderAll();
  }
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

init();
