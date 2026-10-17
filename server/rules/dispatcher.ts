import { Supplier } from '../../src/types/index.ts';

export function selectBestSupplier(
  category: string,
  suppliers: Supplier[],
  preferredSupplierId?: string
): { selected: Supplier; alternates: Supplier[]; explanation: string } {
  // Normalize category match
  const catLower = category.toLowerCase().trim();
  
  // Find suppliers that match category or have general supply capability
  let matching = suppliers.filter((s) => {
    const sCat = s.category.toLowerCase();
    return sCat.includes(catLower) || catLower.includes(sCat);
  });

  if (matching.length === 0) {
    matching = [...suppliers];
  }

  // Sort by score (primary), then on_time_rate (secondary), then total_orders
  matching.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.on_time_rate !== a.on_time_rate) return b.on_time_rate - a.on_time_rate;
    return b.total_orders - a.total_orders;
  });

  // If user specified an explicit supplier ID and it's valid
  if (preferredSupplierId) {
    const preferred = suppliers.find((s) => s.id === preferredSupplierId);
    if (preferred) {
      const alternates = suppliers.filter((s) => s.id !== preferred.id);
      return {
        selected: preferred,
        alternates,
        explanation: `Explicitly routed to preferred vendor ${preferred.name} (Score: ${preferred.score.toFixed(1)}/10)`,
      };
    }
  }

  const selected = matching[0];
  const alternates = matching.slice(1);

  return {
    selected,
    alternates,
    explanation: `Autopilot selected top-rated supplier ${selected.name} with score ${selected.score.toFixed(1)}/10 (${(selected.on_time_rate * 100).toFixed(0)}% on-time, ${(selected.damage_rate * 100).toFixed(0)}% damage rate)`,
  };
}
