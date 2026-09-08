export const packageName = "@meridian/paper-engine" as const;

/** Paper matching lives here (pure, no I/O). Placeholder until PBI-015. */
export function matcherReady(): boolean {
  return true;
}

export { notionalFromShares, referencePrice, sharesFromNotional } from "./qty-mode";
export {
  applyFeeSchedule,
  assemblePreview,
  buildOrderFacts,
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
