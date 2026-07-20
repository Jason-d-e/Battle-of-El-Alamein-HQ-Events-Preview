function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHistoricalNarrativeGameStateAdapter({
  normalizeNarrativeState,
  createLegacyNarrativeState,
} = {}) {
  if (typeof normalizeNarrativeState !== "function") {
    throw new TypeError("historical narrative game-state adapter requires normalizeNarrativeState");
  }
  if (typeof createLegacyNarrativeState !== "function") {
    throw new TypeError("historical narrative game-state adapter requires createLegacyNarrativeState");
  }

  function normalizeGameState(gameState) {
    if (!gameState || typeof gameState !== "object" || Array.isArray(gameState)) {
      throw new TypeError("historical narrative game state must be an object");
    }
    const nextState = cloneJson(gameState);
    const hasNarrativeState = Object.prototype.hasOwnProperty.call(nextState, "historicalNarrative");
    nextState.historicalNarrative = normalizeNarrativeState(
      hasNarrativeState ? nextState.historicalNarrative : createLegacyNarrativeState(nextState),
    );
    return nextState;
  }

  function extractPresentationState(gameState) {
    const narrative = normalizeNarrativeState(gameState?.historicalNarrative);
    return cloneJson({
      readEntryIds: narrative.readEntryIds,
      acknowledgements: narrative.acknowledgements,
    });
  }

  function applyPresentationState(gameState, presentationState) {
    const nextState = normalizeGameState(gameState);
    const authoritativeNarrative = nextState.historicalNarrative;
    const presentation = normalizeNarrativeState(presentationState);
    nextState.historicalNarrative = normalizeNarrativeState({
      ...authoritativeNarrative,
      readEntryIds: [
        ...authoritativeNarrative.readEntryIds,
        ...presentation.readEntryIds,
      ],
      acknowledgements: {
        ...authoritativeNarrative.acknowledgements,
        ...presentation.acknowledgements,
      },
      decisions: authoritativeNarrative.decisions,
    });
    return nextState;
  }

  function adoptAuthoritativeState(authoritativeState, presentationState) {
    return applyPresentationState(authoritativeState, presentationState ?? {});
  }

  return Object.freeze({
    normalizeGameState,
    adoptAuthoritativeState,
    extractPresentationState,
    applyPresentationState,
  });
}
