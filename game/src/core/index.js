export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { isEnemyZoc } from "./zoc.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { getReachableHexes, movementAllowance } from "./movement.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
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
} from "./environment.js?v=e4554d5a3aa8dc91190cf1cd919b9cf6fb148fcc";
