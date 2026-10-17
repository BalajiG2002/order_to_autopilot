import { OrderStep, OrderDocument } from '../../src/types/index.ts';

export const ALLOWED_TRANSITIONS: Record<OrderStep, OrderStep[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['ORDERED'],
  REJECTED: [],
  ORDERED: ['CONFIRMED'],
  CONFIRMED: ['SHIPPED'],
  SHIPPED: ['RECEIVED'],
  RECEIVED: ['DOCS_COMPLETE', 'CLOSED'], // Can transition to docs complete or closed if docs present
  DOCS_COMPLETE: ['CLOSED'],
  CLOSED: [],
};

/**
 * Validates whether transition from fromStep to toStep is permitted
 */
export function canTransition(fromStep: OrderStep, toStep: OrderStep): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStep] || [];
  return allowed.includes(toStep);
}

/**
 * Closes are only allowed if both RECEIPT and INVOICE documents exist
 */
export function validateClosureRequirements(documents: OrderDocument[]): { valid: boolean; missing: string[] } {
  const hasReceipt = documents.some((d) => d.type === 'RECEIPT');
  const hasInvoice = documents.some((d) => d.type === 'INVOICE');

  const missing: string[] = [];
  if (!hasReceipt) missing.push('Goods Delivery Receipt');
  if (!hasInvoice) missing.push('Supplier Commercial Invoice');

  return {
    valid: missing.length === 0,
    missing,
  };
}
