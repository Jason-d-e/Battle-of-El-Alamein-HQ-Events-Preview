export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { isEnemyZoc } from "./zoc.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { getReachableHexes, movementAllowance } from "./movement.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
export {
  ENV_ACTION,
  ENV_EVENT,
  activeSide,
  applyEnvironmentAction,
  cloneGameState,
  compactAction,
  createEnvironment,
  currentPhase,
  environmentContext,
  environmentMetrics,
  evaluateEnvironmentVictory,
  generateLegalActions,
  makeInitialEnvironmentState,
  restorePreviousState,
  stateHash,
  stateHashForState,
} from "./environment.js?v=947ab7ad34ec8de82a35f78d806e2fc1d6d6ac07";
