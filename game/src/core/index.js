export { createBoard, getHex, hexDistance, neighborsOf } from "./board.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { terrainRule, isPassableTerrain } from "./terrain.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { liveUnitAt, liveUnits, resolveUnit, unitById } from "./units.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { isEnemyZoc } from "./zoc.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { getReachableHexes, movementAllowance } from "./movement.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { getLegalRetreatDestinations, getLegalRetreatPaths } from "./retreat.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { calculateOdds, canAttack, defenseBreakdown, planCombatResult } from "./combat.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { shouldCheckAxisObjectiveVictoryAtPhaseEnd } from "./phases.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
export { evaluateAlliedBreakthroughVictory, evaluateAxisObjectiveVictory, getObjectiveStatus, isAlliedBreakthroughMove } from "./victory.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
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
} from "./environment.js?v=4339489a236e2c9b2654adb0eb658e461b44e31c";
