export const HISTORICAL_NARRATIVE_SCHEMA = 1;

const SIDES = ["axis", "allied"];
const HEADQUARTERS_SECTIONS = ["events", "letters"];
const SUPPORTED_LANGUAGES = ["zh", "en"];
const SUPPORTED_EFFECTS = new Set(["none", "set-game-flag"]);
const SUPPORTED_IMPACTS = new Set(["flavor", "gameplay"]);
const SUPPORTED_DISPLAY_POLICIES = new Set(["hidden", "image_only"]);
const SUPPORTED_DOCUMENT_KINDS = new Set(["letter", "telegram", "field-remark"]);
const HQ_NONCOMMERCIAL_MEDIA_SCOPE = "hq_noncommercial_experiment";
const HQ_NONCOMMERCIAL_RELEASE_STATE = "included_in_hq_noncommercial_preview";
const DOCUMENT_BACKGROUND_PRESENTATION = "document_background";
const LOCALIZED_VALUE_FIELDS = new Set(SUPPORTED_LANGUAGES);
const RUNTIME_MEDIA_FIELDS = new Set([
  "assetId",
  "src",
  "altText",
  "displayPolicy",
  "presentationMode",
  "imageFit",
  "mediaScope",
  "releaseState",
  "requiredCredit",
  "overlay",
  "subject",
]);
const RUNTIME_CREDIT_FIELDS = new Set([
  "status",
  "attribution",
  "rights",
  "rightsUrl",
  "sourceUrl",
  "modifications",
]);

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
    if (localized.signature !== undefined
      && (typeof localized.signature !== "string" || !localized.signature.trim())) {
      throw new Error(`${label}.${language}.signature must be a non-empty string when provided`);
    }
  }
}

function assertRuntimeFields(value, allowedFields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      throw new Error(`${label} contains an unsupported runtime field`);
    }
  }
}

function assertLocalizedValue(value, label) {
  assertRuntimeFields(value, LOCALIZED_VALUE_FIELDS, label);
  for (const language of SUPPORTED_LANGUAGES) {
    if (typeof value?.[language] !== "string" || !value[language].trim()) {
      throw new Error(`${label} is missing ${language} localization`);
    }
  }
}

function assertMedia(media, entryId, mediaByAssetId) {
  if (!media || typeof media !== "object" || Array.isArray(media)) {
    throw new Error(`Entry ${entryId} contains invalid media`);
  }
  assertRuntimeFields(media, RUNTIME_MEDIA_FIELDS, `Entry ${entryId} media`);
  if (typeof media.assetId !== "string" || !/^IMG-[A-Z0-9-]+$/.test(media.assetId)) {
    throw new Error(`Entry ${entryId} media needs a stable assetId`);
  }
  const isHqNoncommercialMedia = media.mediaScope !== undefined
    || media.releaseState !== undefined
    || media.presentationMode !== undefined
    || media.imageFit !== undefined;
  if (isHqNoncommercialMedia) {
    if (media.mediaScope !== HQ_NONCOMMERCIAL_MEDIA_SCOPE) {
      throw new Error(`Entry ${entryId} media ${media.assetId} has invalid HQ experiment mediaScope`);
    }
    if (media.releaseState !== HQ_NONCOMMERCIAL_RELEASE_STATE) {
      throw new Error(`Entry ${entryId} media ${media.assetId} must remain limited to the HQ noncommercial preview`);
    }
    if (media.presentationMode !== DOCUMENT_BACKGROUND_PRESENTATION) {
      throw new Error(`Entry ${entryId} media ${media.assetId} has invalid HQ experiment presentationMode`);
    }
    if (media.imageFit !== "contain") {
      throw new Error(`Entry ${entryId} media ${media.assetId} imageFit must be contain for full-image display`);
    }
    if (media.displayPolicy !== "image_only") {
      throw new Error(`Entry ${entryId} media ${media.assetId} must use image_only displayPolicy`);
    }
    if (media.requiredCredit !== undefined) {
      throw new Error(`Entry ${entryId} media ${media.assetId} must not fabricate verified requiredCredit`);
    }
    if (typeof media.src !== "string" || !media.src.startsWith("./local-assets/photos/")) {
      throw new Error(`Entry ${entryId} media ${media.assetId} needs an HQ local-asset source path`);
    }
  } else if (typeof media.src !== "string" || !media.src.startsWith("./local-assets/")) {
    throw new Error(`Entry ${entryId} media ${media.assetId} needs a local source path`);
  }
  const previousSrc = mediaByAssetId.get(media.assetId);
  if (previousSrc && previousSrc !== media.src) {
    throw new Error(`Media assetId ${media.assetId} has conflicting source paths`);
  }
  mediaByAssetId.set(media.assetId, media.src);

  if (!SUPPORTED_DISPLAY_POLICIES.has(media.displayPolicy)) {
    throw new Error(`Entry ${entryId} media ${media.assetId} has unsupported displayPolicy ${media.displayPolicy}`);
  }
  assertLocalizedValue(media.altText, `Entry ${entryId} media ${media.assetId} altText`);
  if (isHqNoncommercialMedia) return;
  const requiredCredit = media.requiredCredit;
  if (!requiredCredit || requiredCredit.status !== "verified") {
    throw new Error(`Entry ${entryId} media ${media.assetId} requiredCredit must be verified`);
  }
  assertRuntimeFields(
    requiredCredit,
    RUNTIME_CREDIT_FIELDS,
    `Entry ${entryId} media ${media.assetId} requiredCredit`,
  );
  for (const field of ["rights", "attribution"]) {
    if (typeof requiredCredit[field] !== "string" || !requiredCredit[field].trim()) {
      throw new Error(`Entry ${entryId} media ${media.assetId} requiredCredit needs ${field}`);
    }
  }
  for (const field of ["rightsUrl", "sourceUrl"]) {
    if (typeof requiredCredit[field] !== "string" || !requiredCredit[field].startsWith("https://")) {
      throw new Error(`Entry ${entryId} media ${media.assetId} requiredCredit needs an HTTPS ${field}`);
    }
  }
  assertLocalizedValue(
    requiredCredit.modifications,
    `Entry ${entryId} media ${media.assetId} requiredCredit modifications`,
  );
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

function assertIsoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be an ISO date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid ISO date`);
  }
}

function assertDocument(document, entry) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`Entry ${entry.id} document must be an object`);
  }
  if (!SUPPORTED_DOCUMENT_KINDS.has(document.kind)) {
    throw new Error(`Entry ${entry.id} has unsupported document kind ${document.kind ?? "unknown"}`);
  }
  if (entry.surface !== "headquarters" || entry.section !== "letters") {
    throw new Error(`Entry ${entry.id} document must appear in the headquarters letters section`);
  }
  assertIsoDate(document.date, `Entry ${entry.id} document date`);
  if (document.date > entry.unlock.date) {
    throw new Error(`Entry ${entry.id} document date cannot be later than its unlock date`);
  }
  if (typeof document.originalLanguage !== "string" || !document.originalLanguage.trim()) {
    throw new Error(`Entry ${entry.id} document needs an original language`);
  }
  if (typeof document.originalTextVerified !== "boolean") {
    throw new Error(`Entry ${entry.id} document needs an originalTextVerified flag`);
  }
  assertLocalizedValue(document.translationBasis, `Entry ${entry.id} document translationBasis`);
  if (document.timelineLabel !== undefined) {
    assertLocalizedValue(document.timelineLabel, `Entry ${entry.id} document timelineLabel`);
  }
}

function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== HISTORICAL_NARRATIVE_SCHEMA || !Array.isArray(catalog.entries)) {
    throw new Error(`Historical narrative catalog must use schema ${HISTORICAL_NARRATIVE_SCHEMA}`);
  }
  if (!catalog.turnDates || typeof catalog.turnDates !== "object" || Array.isArray(catalog.turnDates)) {
    throw new Error("Historical narrative catalog needs a turnDates map");
  }
  for (const [turn, date] of Object.entries(catalog.turnDates)) {
    if (!/^[1-9]\d*$/.test(turn)) {
      throw new Error(`Historical narrative turnDates contains invalid turn ${turn}`);
    }
    assertIsoDate(date, `Historical narrative turn ${turn} date`);
  }

  const entryIds = new Set();
  const mediaByAssetId = new Map();
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
    assertIsoDate(entry.unlock.date, `Entry ${entry.id} unlock date`);
    const turnDate = catalog.turnDates[String(entry.unlock.turn)];
    if (!turnDate || entry.unlock.date !== turnDate) {
      throw new Error(`Entry ${entry.id} unlock date must match historical turn ${entry.unlock.turn}`);
    }
    if (entry.unlock.timing !== "turn-start") {
      throw new Error(`Entry ${entry.id} has unsupported unlock timing ${entry.unlock.timing}`);
    }
    if (entry.unlock.flagsAll !== undefined && !Array.isArray(entry.unlock.flagsAll)) {
      throw new Error(`Entry ${entry.id} flagsAll must be an array`);
    }
    assertLocalizedText(entry.content, `Entry ${entry.id}`);
    const localizedSignatures = SUPPORTED_LANGUAGES.map((language) => entry.content[language].signature);
    if (localizedSignatures.some((signature) => signature !== undefined)) {
      if (!localizedSignatures.every((signature) => typeof signature === "string" && signature.trim())) {
        throw new Error(`Entry ${entry.id} signature must be localized in every supported language`);
      }
      if (entry.surface !== "headquarters" || entry.section !== "letters" || entry.document === undefined) {
        throw new Error(`Entry ${entry.id} signature requires a headquarters document in the letters section`);
      }
    }
    for (const media of entry.media ?? []) {
      assertMedia(media, entry.id, mediaByAssetId);
    }

    if (entry.surface === "headquarters") {
      if (!HEADQUARTERS_SECTIONS.includes(entry.section)) {
        throw new Error(`Entry ${entry.id} has unsupported headquarters section ${entry.section}`);
      }
    } else if (entry.surface !== "turn-briefing") {
      throw new Error(`Entry ${entry.id} has unsupported surface ${entry.surface}`);
    }
    if (entry.document !== undefined) assertDocument(entry.document, entry);

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
    ...(content.signature ? { signature: content.signature } : {}),
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
