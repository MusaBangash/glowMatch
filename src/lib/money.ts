/**
 * All money in GlowMatch is stored as whole Pakistani rupees (integers).
 * See CLAUDE.md, "Business rules".
 */
export function formatPrice(rupees: number): string {
  if (!Number.isInteger(rupees) || rupees < 0) {
    throw new Error(
      `Invalid price: ${rupees}. Prices must be whole, non-negative rupees.`,
    );
  }
  return `Rs ${rupees.toLocaleString("en-US")}`;
}
