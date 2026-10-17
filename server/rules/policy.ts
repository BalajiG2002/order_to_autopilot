import { ProcurementPolicy, Supplier } from '../../src/types/index.ts';

export const DEFAULT_POLICY: ProcurementPolicy = {
  auto_approve_max_value: 5000,
  min_supplier_score: 7.5,
  chase_interval_hours: 24,
  max_chases_before_escalate: 2,
};

export interface PolicyEvaluationResult {
  autoApproved: boolean;
  reasons: string[];
  flags: string[];
  requiresManagerApproval: boolean;
}

export function evaluateApprovalPolicy(
  totalValue: number,
  supplier: Supplier,
  policy: ProcurementPolicy = DEFAULT_POLICY
): PolicyEvaluationResult {
  const reasons: string[] = [];
  const flags: string[] = [];

  const exceedsValueLimit = totalValue > policy.auto_approve_max_value;
  const belowMinScore = supplier.score < policy.min_supplier_score;

  if (exceedsValueLimit) {
    reasons.push(
      `Order value $${totalValue.toLocaleString()} exceeds automatic threshold limit of $${policy.auto_approve_max_value.toLocaleString()}`
    );
    flags.push('VALUE_THRESHOLD_EXCEEDED');
  }

  if (belowMinScore) {
    reasons.push(
      `Selected supplier ${supplier.name} has score ${supplier.score.toFixed(1)}, below required minimum threshold of ${policy.min_supplier_score}`
    );
    flags.push('LOW_SUPPLIER_SCORE');
  }

  if (supplier.damage_rate > 0.1) {
    flags.push('HIGH_HISTORICAL_DAMAGE');
    reasons.push(`Supplier has elevated damage rate of ${(supplier.damage_rate * 100).toFixed(0)}%`);
  }

  const autoApproved = !exceedsValueLimit && !belowMinScore;

  return {
    autoApproved,
    reasons,
    flags,
    requiresManagerApproval: !autoApproved,
  };
}
