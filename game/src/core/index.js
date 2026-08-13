export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { isEnemyZoc } from "./zoc.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { getReachableHexes, movementAllowance } from "./movement.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
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
} from "./environment.js?v=6a644862a44efa862d693def7dfce39ce4fec673";
