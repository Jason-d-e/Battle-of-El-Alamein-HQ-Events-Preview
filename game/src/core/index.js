export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { isEnemyZoc } from "./zoc.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { getReachableHexes, movementAllowance } from "./movement.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
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
} from "./environment.js?v=16ec5c1c0b9999875f5d6dfed861e5c8dba1bd36";
