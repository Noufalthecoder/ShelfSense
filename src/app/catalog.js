// Demo products for reliable demos. Barcodes use the 200 prefix (reserved for in-store use),
// so they never clash with real products. Real barcodes are looked up on Open Beauty Facts.

export function eanCheck(d12) {
  const sum = [...d12].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return d12 + ((10 - (sum % 10)) % 10);
}

export const DEMO_PRODUCTS = [
  {
    code: eanCheck('200000000001'),
    name: 'Serum Nº 10 · Niacinamide 10% + Zinc 1%',
    brand: 'Demo Lab',
    kind: 'skincare',
    color: '#c8763f',
    ingredients: 'Aqua, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin',
  },
  {
    code: eanCheck('200000000002'),
    name: 'Glow AHA Toner',
    brand: 'Demo Lab',
    kind: 'skincare',
    color: '#e7a3b3',
    ingredients: 'Aqua, Glycolic Acid, Rosa Damascena Flower Water, Aloe Barbadensis Leaf Water, Glycerin, Alcohol Denat., Parfum, Limonene, Linalool',
  },
  {
    code: eanCheck('200000000003'),
    name: 'Rich Coconut Night Cream',
    brand: 'Demo Lab',
    kind: 'skincare',
    color: '#efe2cf',
    ingredients: 'Aqua, Cocos Nucifera Oil, Isopropyl Myristate, Butyrospermum Parkii Butter, Cetearyl Alcohol, Parfum, Lanolin, Phenoxyethanol',
  },
  {
    code: eanCheck('200000000004'),
    name: 'Barrier Cica Cream',
    brand: 'Demo Lab',
    kind: 'skincare',
    color: '#b9cfb1',
    ingredients: 'Aqua, Glycerin, Centella Asiatica Extract, Ceramide NP, Panthenol, Squalane, Madecassoside, Allantoin, Sodium Hyaluronate',
  },
  {
    code: eanCheck('200000000005'),
    name: 'Velvet Lip · Ruby 04',
    brand: 'Demo Lab',
    kind: 'lip',
    color: '#b0283f',
    shade: '#B0283F',
    ingredients: 'Ricinus Communis Seed Oil, Cera Alba, Caprylic/Capric Triglyceride, Squalane, Tocopherol, CI 15850',
  },
  {
    code: eanCheck('200000000006'),
    name: 'Velvet Lip · Coral 02',
    brand: 'Demo Lab',
    kind: 'lip',
    color: '#e8604c',
    shade: '#E8604C',
    ingredients: 'Ricinus Communis Seed Oil, Cera Alba, Caprylic/Capric Triglyceride, Hyaluronic Acid, Tocopherol, CI 15850, Parfum',
  },
].map((p) => ({ ...p, demo: true, source: 'Demo catalog' }));

export const findDemo = (code) => DEMO_PRODUCTS.find((p) => p.code === code);

// YouCam Makeup VTO effect for a product's shade
export function vtoEffects(product) {
  if (product.kind === 'lip' && product.shade) {
    return [{ category: 'lip_color', shape: { name: 'original' }, palettes: [{ color: product.shade, texture: 'matte', colorIntensity: 60 }], style: { type: 'full' } }];
  }
  if (product.kind === 'foundation' && product.shade) {
    return [{ category: 'foundation', palettes: [{ color: product.shade, colorIntensity: 40, glowIntensity: 45, coverageIntensity: 35 }] }];
  }
  return null;
}
