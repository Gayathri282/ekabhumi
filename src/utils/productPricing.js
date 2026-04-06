// Convert any value safely to number
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Main pricing logic (STRICT: data-driven, no fake discounts)
export function getProductPricing(product) {
  const offerPrice = Number(product?.price) || 0;
  
  const rawBase = product?.original_price;
  const basePrice = rawBase != null && rawBase !== "" 
    ? Number(rawBase) 
    : null;

  const hasDiscount = basePrice !== null && 
                      basePrice > 0 && 
                      basePrice > offerPrice;

  const savings = hasDiscount ? basePrice - offerPrice : 0;
  const discountPercent = hasDiscount
    ? Math.round((savings / basePrice) * 100)
    : 0;

  return {
    basePrice,
    offerPrice,
    savings,
    discountPercent,
    hasDiscount,
  };
}

// Currency formatter (Indian format)
export function formatCurrency(value) {
  return toNumber(value).toLocaleString("en-IN");
}
