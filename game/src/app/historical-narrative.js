export const HISTORICAL_NARRATIVE_SCHEMA = 1;

const SIDES = ["axis", "allied"];
const HEADQUARTERS_SECTIONS = ["events", "letters"];
const SUPPORTED_LANGUAGES = ["zh", "en"];
const SUPPORTED_EFFECTS = new Set(["none", "set-game-flag"]);
const SUPPORTED_IMPACTS = new Set(["flavor", "gameplay"]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueKnownIds(value, knownIds) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => knownIds.has(id)))];
}

function assertLocalizedText(value, label) {
  for (const language of SUPPORTED_LANGUAGES) {
    const localized = value?.[language];
    if (!localized || typeof localized !== "object") {
      throw new Error(`${label} is missing ${language} localization`);
    }
    if (typeof localized.title !== "string" || !localized.title.trim()) {
      throw new Error(`${label}.${language}.title must be a non-empty string`);
    }
    if (typeof localized.body !== "string" || !localized.body.trim()) {
      throw new Error(`${label}.${language}.body must be a non-empty string`);
    }
  }
}

function assertChoice(choice, entryId, seenChoiceIds) {
  if (!choice || typeof choice !== "object" || !choice.id) {
    throw new Error(`Entry ${entryId} has a decision without an id`);
  }
  if (seenChoiceIds.has(choice.id)) {
    throw new Error(`Entry ${entryId} has duplicate decision id ${choice.id}`);
  }
  seenChoiceIds.add(choice.id);

  for (const language of SUPPORTED_LANGUAGES) {
    if (typeof choice.label?.[language] !== "string" || !choice.label[language].trim()) {
      throw new Error(`Decision ${choice.id} is missing ${language} label`);
    }
  }

  if (!Array.isArray(choice.effects)) {
    throw new Error(`Decision ${choice.id} effects must be an array`);
  }
  for (const effect of choice.effects) {
    if (!effect || !SUPPORTED_EFFECTS.has(effect.type)) {
      throw new Error(`Decision ${choice.id} has unsupported effect ${effect?.type ?? "unknown"}`);
    }
    if (effect.type === "set-game-flag" && (typeof effect.flag !== "string" || !effect.flag)) {
      throw new Error(`Decision ${choice.id} set-game-flag effect needs a flag`);
    }
    if (effect.type === "set-game-flag" && typeof effect.value !== "boolean") {
      throw new Error(`Decision ${choice.id} set-game-flag effect needs a boolean value`);
    }
  }
}

function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== HISTORICAL_NARRATIVE_SCHEMA || !Array.isArray(catalog.entries)) {
    throw new Error(`Historical narrative catalog must use schema ${HISTORICAL_NARRATIVE_SCHEMA}`);
  }

  const entryIds = new Set();
  for (const entry of catalog.entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id) {
      throw new Error("Historical narrative entry is missing an id");
    }
    if (entryIds.has(entry.id)) {
      throw new Error(`Duplicate historical narrative entry id ${entry.id}`);
    }
    entryIds.add(entry.id);

    if (!SIDES.includes(entry.side)) {
      throw new Error(`Entry ${entry.id} has unsupported side ${entry.side}`);
    }
    if (!SUPPORTED_IMPACTS.has(entry.impact)) {
      throw new Error(`Entry ${entry.id} has unsupported impact ${entry.impact}`);
    }
    if (!entry.unlock || !Number.isInteger(entry.unlock.turn) || entry.unlock.turn < 1) {
      throw new Error(`Entry ${entry.id} needs a positive integer unlock turn`);
    }
    if (entry.unlock.timing !== "turn-start") {
      throw new Error(`Entry ${entry.id} has unsupported unlock timing ${entry.unlock.timing}`);
    }
    if (entry.unlock.flagsAll !== undefined && !Array.isArray(entry.unlock.flagsAll)) {
      throw new Error(`Entry ${entry.id} flagsAll must be an array`);
    }
    assertLocalizedText(entry.content, `Entry ${entry.id}`);

    if (entry.surface === "headquarters") {
      if (!HEADQUARTERS_SECTIONS.includes(entry.section)) {
        throw new Error(`Entry ${entry.id} has unsupported headquarters section ${entry.section}`);
      }
    } else if (entry.surface !== "turn-briefing") {
      throw new Error(`Entry ${entry.id} has unsupported surface ${entry.surface}`);
    }

    const seenChoiceIds = new Set();
    for (const choice of entry.choices ?? []) {
      assertChoice(choice, entry.id, seenChoiceIds);
      if (entry.impact === "flavor" && choice.effects.some((effect) => effect.type !== "none")) {
        throw new Error(`Flavor entry ${entry.id} cannot declare gameplay effects`);
      }
    }
  }
  return entryIds;
}

function isUnlockedBy(command, entry) {
  if (command.turn < entry.unlock.turn) return false;
  const flags = new Set(Array.isArray(command.flags) ? command.flags : []);
  return (entry.unlock.flagsAll ?? []).every((flag) => flags.has(flag));
}

function emptySection() {
  return { entries: [] };
}

function localizeEntry(entry, language, state) {
  const normalizedLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : "zh";
  const content = entry.content[normalizedLanguage];
  return {
    id: entry.id,
    side: entry.side,
    surface: entry.surface,
    section: entry.section ?? null,
    impact: entry.impact,
    title: content.title,
    eyebrow: content.eyebrow ?? "",
    body: content.body,
    media: entry.media ? cloneJson(entry.media) : null,
    source: entry.source ? cloneJson(entry.source) : null,
    document: entry.document ? cloneJson(entry.document) : null,
    isNew: !state.readEntryIds.includes(entry.id),
    choices: (entry.choices ?? []).map((choice) => ({
      id: choice.id,
      label: choice.label[normalizedLanguage],
    })),
  };
}

export function reduceHistoricalNarrativeEffects(rawFlags, effects, { allowGameplay = true } = {}) {
  const sourceFlags = rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)
    ? rawFlags
    : {};
  if (!Array.isArray(effects)) {
    throw new TypeError("historical narrative effects must be an array");
  }
  const nextFlags = { ...sourceFlags };
  for (const effect of effects) {
    if (effect?.type === "none") continue;
    if (effect?.type !== "set-game-flag" || typeof effect.flag !== "string" || !effect.flag || typeof effect.value !== "boolean") {
      throw new Error(`Unsupported historical narrative effect: ${effect?.type || "unknown"}`);
    }
    if (!allowGameplay) {
      throw new Error("Gameplay historical effects require an authoritative Online action");
    }
    nextFlags[effect.flag] = effect.value;
  }
  return nextFlags;
}

export function createHistoricalNarrativeModule(catalog) {
  const knownIds = validateCatalog(catalog);
  const entriesById = new Map(catalog.entries.map((entry) => [entry.id, entry]));

  function createState(raw = {}) {
    const acknowledgements = {};
    const decisions = {};

    function collectResolvedChoices(source) {
      if (!source || typeof source !== "object" || Array.isArray(source)) return;
      for (const [entryId, choiceId] of Object.entries(source)) {
        const entry = entriesById.get(entryId);
        if (!entry?.choices?.some((choice) => choice.id === choiceId)) continue;
        if (entry.impact === "gameplay") decisions[entryId] = choiceId;
        else acknowledgements[entryId] = choiceId;
      }
    }

    collectResolvedChoices(raw.decisions);
    collectResolvedChoices(raw.acknowledgements);

    return {
      schema: HISTORICAL_NARRATIVE_SCHEMA,
      lastStartedTurn: Number.isInteger(raw.lastStartedTurn) && raw.lastStartedTurn > 0
        ? raw.lastStartedTurn
        : 0,
      unlockedEntryIds: uniqueKnownIds(raw.unlockedEntryIds, knownIds),
      readEntryIds: uniqueKnownIds(raw.readEntryIds, knownIds),
      acknowledgements,
      decisions,
    };
  }

  function transition(rawState, command) {
    const state = createState(rawState);
    if (!command || typeof command.type !== "string") {
      throw new Error("Unsupported historical narrative command");
    }

    if (command.type === "TURN_STARTED") {
      if (!Number.isInteger(command.turn) || command.turn < 1) {
        throw new Error("TURN_STARTED requires a positive integer turn");
      }
      const unlocked = new Set(state.unlockedEntryIds);
      for (const entry of catalog.entries) {
        if (isUnlockedBy(command, entry)) unlocked.add(entry.id);
      }
      return {
        state: {
          ...state,
          lastStartedTurn: Math.max(state.lastStartedTurn, command.turn),
          unlockedEntryIds: [...unlocked],
        },
        effects: [],
      };
    }

    if (command.type === "ENTRY_OPENED") {
      if (!state.unlockedEntryIds.includes(command.entryId)) {
        throw new Error(`Historical narrative entry ${command.entryId} is not unlocked`);
      }
      const entry = entriesById.get(command.entryId);
      if (entry.surface !== "headquarters") {
        throw new Error(`Historical narrative entry ${command.entryId} is not a headquarters entry`);
      }
      return {
        state: {
          ...state,
          readEntryIds: [...new Set([...state.readEntryIds, command.entryId])],
        },
        effects: [],
      };
    }

    if (command.type === "DECISION_MADE") {
      const entry = entriesById.get(command.entryId);
      if (!entry || !state.unlockedEntryIds.includes(command.entryId)) {
        throw new Error(`Historical narrative entry ${command.entryId} is not unlocked`);
      }
      if (!entry.choices?.length) {
        throw new Error(`Historical narrative entry ${command.entryId} does not offer decisions`);
      }
      const choice = entry.choices.find((candidate) => candidate.id === command.choiceId);
      if (!choice) {
        throw new Error(`Historical narrative entry ${command.entryId} has no decision ${command.choiceId}`);
      }
      const resolutionKey = entry.impact === "gameplay" ? "decisions" : "acknowledgements";
      return {
        state: {
          ...state,
          [resolutionKey]: { ...state[resolutionKey], [entry.id]: choice.id },
        },
        effects: cloneJson(choice.effects),
      };
    }

    throw new Error(`Unsupported historical narrative command ${command.type}`);
  }

  function createLegacyState({ turn, flags = [] } = {}) {
    const started = transition(createState(), { type: "TURN_STARTED", turn, flags }).state;
    const acknowledgements = { ...started.acknowledgements };
    for (const entryId of started.unlockedEntryIds) {
      const entry = entriesById.get(entryId);
      if (entry?.surface !== "turn-briefing" || entry.impact !== "flavor" || !entry.choices?.length) continue;
      acknowledgements[entry.id] = entry.choices[0].id;
    }
    return createState({ ...started, acknowledgements });
  }

  function select(rawState, options = {}) {
    const state = createState(rawState);
    const language = SUPPORTED_LANGUAGES.includes(options.language) ? options.language : "zh";
    const unlockedEntries = state.unlockedEntryIds
      .map((id) => entriesById.get(id))
      .filter(Boolean);

    const pendingEntry = unlockedEntries.find((entry) => (
      entry.surface === "turn-briefing"
      && !state.acknowledgements[entry.id]
      && !state.decisions[entry.id]
    ));

    const headquarters = {};
    for (const side of SIDES) {
      const sideEntries = unlockedEntries.filter((entry) => (
        entry.surface === "headquarters" && entry.side === side
      ));
      const sections = {
        events: emptySection(),
        letters: emptySection(),
      };
      for (const section of HEADQUARTERS_SECTIONS) {
        sections[section].entries = sideEntries
          .filter((entry) => entry.section === section)
          .map((entry) => localizeEntry(entry, language, state));
      }
      headquarters[side] = {
        side,
        unreadCount: sideEntries.filter((entry) => !state.readEntryIds.includes(entry.id)).length,
        sections,
      };
    }

    return {
      pendingBriefing: pendingEntry ? localizeEntry(pendingEntry, language, state) : null,
      headquarters,
    };
  }

  return Object.freeze({ createState, createLegacyState, transition, select });
}
