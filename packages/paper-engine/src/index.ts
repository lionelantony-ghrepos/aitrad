export const packageName = "@meridian/paper-engine" as const;

/** Paper matching lives here (pure, no I/O). */
export function matcherReady(): boolean {
  return true;
}

export { notionalFromShares, referencePrice, sharesFromNotional } from "./qty-mode";
export {
  applyFeeSchedule,
  assemblePreview,
  buildOrderFacts,
  lastPriceForRuleFacts,
  QUOTE_UNAVAILABLE,
  reasonFromOutcome,
  summarizeHours,
  summarizeRisk,
  summarizeValidation,
  type OrderFactInput,
  type OrderFacts,
} from "./preview";
export {
  CANCEL_FROM,
  ORDER_STATUSES,
  OrderFsmError,
  allowedTransitions,
  assertTransition,
  canCancel,
  canTransition,
} from "./fsm";
export {
  SerializedCashBook,
  availableBuyingPower,
  releaseBuyingPower,
  reserveAmountForSide,
  tryReserveBuyingPower,
  type CashLedger,
} from "./buying-power";
export {
  applyReserveFailure,
  decideOrderPlacement,
  placeWithReserve,
  type DomainEval,
  type PlacementDecision,
} from "./order-pipeline";
export { match, matchOrders, type MatchResult, type TrailingUpdate } from "./match";
export {
  expandOrderGroup,
  groupActionsAfterFills,
  isChildProtectionLeg,
  isOcoLeg,
  isStopPriority,
  oppositeSide,
  resolveSameTickGroupFills,
  shouldPromoteAccepted,
  type ExpandedGroupLeg,
  type GroupOrderRef,
  type GroupSideEffect,
} from "./groups";
export {
  initialTrailMark,
  isTrailingStop,
  ratchetTrailingStop,
  seedTrailingOnCreate,
  type TrailingFields,
  type TrailingRatchet,
} from "./trailing";
export {
  liquidityCapShares,
  parseExecConfig,
  resolveExecConfig,
  type ExecConfigResolver,
} from "./exec-config";
export { applyFillToPosition, emptyPosition, markEquity, type PositionBook } from "./positions";
export { applyFillToLedger, cashDeltaForFill, reservedReleaseForFill } from "./settle";
export {
  applyTickToBook,
  applyTicks,
  bookEquity,
  type CycleOrder,
  type CyclePosition,
  type PaperCycleEvent,
  type PaperCycleResult,
  type PaperCycleState,
} from "./cycle";
