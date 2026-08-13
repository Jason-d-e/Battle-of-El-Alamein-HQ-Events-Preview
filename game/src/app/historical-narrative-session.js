import { createHistoricalNarrativeModule } from "./historical-narrative.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
import {
  toHeadquartersSurfaceModel,
  toTurnBriefingModel,
} from "./historical-narrative-presenter.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";

function normalizedLanguage(language) {
  return language === "en" ? "en" : "zh";
}

function requireSurface(surface, label, methods) {
  if (!surface || methods.some((method) => typeof surface[method] !== "function")) {
    throw new TypeError(`${label} must implement ${methods.join(", ")}`);
  }
}

export function syncHistoricalNarrativeSessionView(session, view) {
  if (!session) return;
  if (typeof session.setActive !== "function") {
    throw new TypeError("historical narrative session must implement setActive");
  }
  session.setActive(view === "game");
}

export function createHistoricalNarrativeSession({
  catalog,
  initialState,
  language = "zh",
  headquartersSurface,
  briefingOverlay,
  onStateChange = () => {},
  onEffects = () => {},
} = {}) {
  requireSurface(headquartersSurface, "headquartersSurface", ["update"]);
  requireSurface(briefingOverlay, "briefingOverlay", ["show", "update", "hide", "isOpen"]);
  if (typeof onStateChange !== "function" || typeof onEffects !== "function") {
    throw new TypeError("historical narrative session callbacks must be functions");
  }

  const narrative = createHistoricalNarrativeModule(catalog);
  let state = narrative.createState(initialState);
  let currentLanguage = normalizedLanguage(language);
  let active = true;
  let currentModel = narrative.select(state, { language: currentLanguage });
  let headquartersUiModel = toHeadquartersSurfaceModel({
    catalog,
    narrativeModel: currentModel,
    language: currentLanguage,
  });

  function syncSurfaces() {
    currentModel = narrative.select(state, { language: currentLanguage });
    headquartersUiModel = toHeadquartersSurfaceModel({
      catalog,
      narrativeModel: currentModel,
      language: currentLanguage,
    });
    headquartersSurface.update(headquartersUiModel);

    if (!active) {
      if (briefingOverlay.isOpen()) briefingOverlay.hide();
      return;
    }

    const briefingModel = toTurnBriefingModel({
      narrativeModel: currentModel,
      language: currentLanguage,
    });
    if (!briefingModel) {
      if (briefingOverlay.isOpen()) briefingOverlay.hide();
    } else if (briefingOverlay.isOpen()) {
      briefingOverlay.update(briefingModel);
    } else {
      briefingOverlay.show(briefingModel);
    }
  }

  function commit(transition) {
    if (transition.effects.length) onEffects(transition.effects);
    state = transition.state;
    onStateChange(state);
    syncSurfaces();
    return state;
  }

  return Object.freeze({
    setActive(nextActive) {
      const normalizedActive = Boolean(nextActive);
      if (active === normalizedActive) return;
      active = normalizedActive;
      syncSurfaces();
    },
    startTurn({ turn, flags = [] } = {}) {
      return commit(narrative.transition(state, { type: "TURN_STARTED", turn, flags }));
    },
    handleHeadquartersCommand(command) {
      return commit(narrative.transition(state, command));
    },
    handleDecision({ entryId, choiceId } = {}) {
      return commit(narrative.transition(state, {
        type: "DECISION_MADE",
        entryId,
        choiceId,
      }));
    },
    replaceState(nextState) {
      state = narrative.createState(nextState);
      syncSurfaces();
      return state;
    },
    setLanguage(nextLanguage) {
      const normalizedNextLanguage = normalizedLanguage(nextLanguage);
      if (currentLanguage === normalizedNextLanguage) return;
      currentLanguage = normalizedNextLanguage;
      syncSurfaces();
    },
    render: syncSurfaces,
    hasBlockingBriefing() {
      return active && Boolean(narrative.select(state, { language: currentLanguage }).pendingBriefing);
    },
    getState() { return state; },
    getModel() { return currentModel; },
    getHeadquartersUiModel() { return headquartersUiModel; },
  });
}
