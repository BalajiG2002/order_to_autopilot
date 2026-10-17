import { Supplier, OrderOutcome } from '../../src/types/index.ts';

/**
 * Supplier Scoring Rule Engine
 * Score formula: score = 10 * (0.6 * on_time_rate + 0.4 * (1 - damage_rate))
 * Scores range from 0.0 to 10.0
 */
export function calculateSupplierScore(onTimeRate: number, damageRate: number): number {
  const boundedOnTime = Math.max(0, Math.min(1, onTimeRate));
  const boundedDamage = Math.max(0, Math.min(1, damageRate));
  const rawScore = 10 * (0.6 * boundedOnTime + 0.4 * (1 - boundedDamage));
  return Math.round(rawScore * 10) / 10;
}

/**
 * Update supplier performance with a rolling average based on new outcome
 */
export function updateSupplierOutcome(supplier: Supplier, outcome: OrderOutcome, totalOrderedQty: number): Supplier {
  const isLate = outcome.result === 'LATE';
  const hasDamage = outcome.damaged_qty > 0 || outcome.result === 'DAMAGED';
  
  // Rolling weight: give recent outcome 25% weight, historical 75%
  const weightRecent = 0.25;
  const weightHistorical = 0.75;

  const currentOnTimeBinary = isLate ? 0 : 1;
  const currentDamageRatio = totalOrderedQty > 0 ? Math.min(1, outcome.damaged_qty / totalOrderedQty) : (hasDamage ? 0.2 : 0);

  const updatedOnTimeRate = Math.round(
    ((supplier.on_time_rate * weightHistorical) + (currentOnTimeBinary * weightRecent)) * 100
  ) / 100;

  const updatedDamageRate = Math.round(
    ((supplier.damage_rate * weightHistorical) + (currentDamageRatio * weightRecent)) * 100
  ) / 100;

  const updatedScore = calculateSupplierScore(updatedOnTimeRate, updatedDamageRate);

  return {
    ...supplier,
    on_time_rate: updatedOnTimeRate,
    damage_rate: updatedDamageRate,
    score: updatedScore,
    total_orders: supplier.total_orders + 1,
    active_pos: Math.max(0, supplier.active_pos - 1),
  };
}
