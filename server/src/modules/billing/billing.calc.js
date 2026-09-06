/**
 * Pure billing/proration calculation functions — no DB access, same
 * isolation convention as quotations/quotations.calc.js.
 */

const FREQUENCY_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

function toDateOnly(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDate(d) {
  return toDateOnly(d).toISOString().split('T')[0];
}

function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toDateOnly(b).getTime() - toDateOnly(a).getTime()) / MS_PER_DAY);
}

/** Adds the plan's cadence in months to a date, returns an ISO date string. */
export function addBillingPeriod(fromDateStr, frequency) {
  const months = FREQUENCY_MONTHS[frequency];
  if (!months) throw new Error(`Unknown billing frequency: ${frequency}`);
  const from = toDateOnly(fromDateStr);
  const result = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()));
  return isoDate(result);
}

/**
 * Day-based proration, per docs/plan.md §6.3:
 *   prorated amount = plan price × active days / days in billing cycle
 */
export function computeProration({ cycleStart, cycleEnd, asOfDate, cycleAmount }) {
  const totalDays = Math.max(1, daysBetween(cycleStart, cycleEnd) + 1); // inclusive
  const usedDays = Math.max(0, Math.min(totalDays, daysBetween(cycleStart, asOfDate)));
  const remainingDays = totalDays - usedDays;
  const amount = Number(cycleAmount);

  const usedAmount = Number(((amount * usedDays) / totalDays).toFixed(2));
  const remainingAmount = Number((amount - usedAmount).toFixed(2));

  return { totalDays, usedDays, remainingDays, usedAmount, remainingAmount };
}

/**
 * Mid-cycle quantity/plan change. Returns the net delta to charge (positive)
 * or credit (negative) for the remainder of the CURRENT cycle only.
 */
export function computeChangeDelta({ cycleStart, cycleEnd, asOfDate, oldCycleAmount, newCycleAmount }) {
  const oldProration = computeProration({ cycleStart, cycleEnd, asOfDate, cycleAmount: oldCycleAmount });
  const newProration = computeProration({ cycleStart, cycleEnd, asOfDate, cycleAmount: newCycleAmount });
  const delta = Number((newProration.remainingAmount - oldProration.remainingAmount).toFixed(2));
  return { delta, oldRemainingAmount: oldProration.remainingAmount, newRemainingAmount: newProration.remainingAmount };
}

/**
 * Cancellation credit — unused value of the current cycle from asOfDate
 * through cycleEnd.
 */
export function computeCancellationCredit({ cycleStart, cycleEnd, asOfDate, cycleAmount }) {
  const proration = computeProration({ cycleStart, cycleEnd, asOfDate, cycleAmount });
  return proration.remainingAmount;
}

export { isoDate, daysBetween };
