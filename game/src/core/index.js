export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { isEnemyZoc } from "./zoc.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { getReachableHexes, movementAllowance } from "./movement.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
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
} from "./environment.js?v=53092a12fd0c301fab72fccb751a3f3ddda2a54b";
