
export type IndustryType = 'boutique' | 'pharmacy' | 'grocery' | 'bakery' | 'restaurant' | 'electronics' | 'default';

export interface IndustryConfig {
    label: string;
    measurementLabels: string[];
    defaultUnit: string;
    hasStock: boolean;
    hasExpiry: boolean;
    hasSerialNumbers?: boolean;
    productFields: {
        label: string;
        key: string;
        placeholder: string;
    }[];
    variantPresets?: {
        name: string;
        values: string;
    }[];
    fastSwitcherBadge?: string;
    fastSwitcherIcon?: 'shirt' | 'smartphone' | 'pill' | 'package' | 'coffee';
    cardActionLabel?: string;
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
    boutique: {
        label: 'Boutique & Tailoring',
        measurementLabels: ['Neck', 'Chest/Bust', 'Waist', 'Hips', 'Shoulder', 'Sleeve', 'Length (Top)', 'Length (Bottom)'],
        defaultUnit: 'Piece',
        hasStock: true,
        hasExpiry: false,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Material/Fabric', key: 'material', placeholder: 'e.g. Cotton, Silk' },
            { label: 'Size/Fit', key: 'variantValue', placeholder: 'e.g. XL, Slim Fit' }
        ],
        variantPresets: [
            { name: 'Size', values: 'S, M, L, XL' },
            { name: 'Color', values: 'Black, White, Navy, Beige' }
        ],
        fastSwitcherBadge: '⚡ Fast Size Switcher',
        fastSwitcherIcon: 'shirt',
        cardActionLabel: 'Sizes'
    },
    pharmacy: {
        label: 'Pharmacy & Health',
        measurementLabels: ['Age Group', 'Blood Type', 'Allergies', 'Chronic Conditions', 'Primary Care Dr.'],
        defaultUnit: 'Pack',
        hasStock: true,
        hasExpiry: true,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Dosage', key: 'dosage', placeholder: 'e.g. 500mg' },
            { label: 'Manufacturer', key: 'manufacturer', placeholder: 'e.g. Pfizer' }
        ],
        variantPresets: [
            { name: 'Dosage', values: '250mg, 500mg, 1000mg' },
            { name: 'Pack Size', values: '10 Tablets, 30 Tablets, 100 Tablets' }
        ],
        fastSwitcherBadge: '⚡ Fast Dosage Switcher',
        fastSwitcherIcon: 'pill',
        cardActionLabel: 'Dosages'
    },
    grocery: {
        label: 'Grocery & Supermarket',
        measurementLabels: ['Preferred Brand', 'Dietary Pref', 'Frequency', 'Delivery Notes'],
        defaultUnit: 'pcs',
        hasStock: true,
        hasExpiry: true,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Weight/Volume', key: 'weightVolume', placeholder: 'e.g. 1kg, 750ml' },
            { label: 'Brand', key: 'brand', placeholder: 'e.g. Nestle' }
        ],
        variantPresets: [
            { name: 'Weight / Volume', values: '500g, 1kg, 2kg, 5kg' },
            { name: 'Packaging', values: 'Single, 6-Pack, Carton' }
        ],
        fastSwitcherBadge: '⚡ Fast Size & Pack Switcher',
        fastSwitcherIcon: 'package',
        cardActionLabel: 'Packs'
    },
    bakery: {
        label: 'Bakery & Cafe',
        measurementLabels: ['Allergies', 'Preferred Sweetness', 'Favorite Flavor', 'Special Occasions'],
        defaultUnit: 'pcs',
        hasStock: true,
        hasExpiry: true,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Flavor/Type', key: 'variantValue', placeholder: 'e.g. Chocolate, Vanilla' },
            { label: 'Packaging', key: 'packaging', placeholder: 'e.g. Box of 6' }
        ],
        variantPresets: [
            { name: 'Flavor', values: 'Vanilla, Chocolate, Red Velvet' },
            { name: 'Size', values: 'Slice, Half, Whole' }
        ],
        fastSwitcherBadge: '⚡ Fast Flavor & Size Switcher',
        fastSwitcherIcon: 'coffee',
        cardActionLabel: 'Options'
    },
    restaurant: {
        label: 'Restaurant & Bar',
        measurementLabels: ['Dietary Restrictions', 'Spice Tolerance', 'Drink Preference', 'Seating Pref'],
        defaultUnit: 'Portion',
        hasStock: true,
        hasExpiry: false,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Spice Level', key: 'spiceLevel', placeholder: 'e.g. Hot, Mild' },
            { label: 'Add-ons', key: 'variantValue', placeholder: 'e.g. Extra Cheese' }
        ],
        variantPresets: [
            { name: 'Portion', values: 'Regular, Large' },
            { name: 'Spice Level', values: 'Mild, Medium, Hot' }
        ],
        fastSwitcherBadge: '⚡ Fast Option Switcher',
        fastSwitcherIcon: 'coffee',
        cardActionLabel: 'Options'
    },
    electronics: {
        label: 'Electronics & Appliances',
        measurementLabels: ['IMEI / Serial No', 'Warranty Status', 'Device Condition'],
        defaultUnit: 'Piece',
        hasStock: true,
        hasExpiry: false,
        hasSerialNumbers: true,
        productFields: [
            { label: 'Model Number', key: 'variantValue', placeholder: 'e.g. iPhone 15 Pro, A2849' },
            { label: 'Brand / Mfr', key: 'brand', placeholder: 'e.g. Apple, Samsung' }
        ],
        variantPresets: [
            { name: 'Storage', values: '128GB, 256GB, 512GB, 1TB' },
            { name: 'Color', values: 'Black, Silver, Space Gray' }
        ],
        fastSwitcherBadge: '⚡ Fast Spec Switcher',
        fastSwitcherIcon: 'smartphone',
        cardActionLabel: 'Specs'
    },
    default: {
        label: 'General Retail',
        measurementLabels: ['Customer Note', 'Reference', 'Engagement Level'],
        defaultUnit: 'Unit',
        hasStock: true,
        hasExpiry: false,
        hasSerialNumbers: false,
        productFields: [
            { label: 'Model/Variant', key: 'variantValue', placeholder: 'e.g. V2, Red' }
        ],
        variantPresets: [
            { name: 'Size', values: 'S, M, L' },
            { name: 'Option', values: 'Standard, Premium' }
        ],
        fastSwitcherBadge: '⚡ Fast Variant Switcher',
        fastSwitcherIcon: 'package',
        cardActionLabel: 'Variants'
    }
};

export function getIndustryConfig(industry?: string): IndustryConfig {
    if (!industry) return INDUSTRY_CONFIGS.default;
    
    const normalized = industry.toLowerCase();
    
    if (normalized.includes('electronic') || normalized.includes('gadget') || normalized.includes('phone') || normalized.includes('computer') || normalized.includes('tech') || normalized.includes('appliance')) {
        return INDUSTRY_CONFIGS.electronics;
    }
    if (normalized.includes('fashion') || normalized.includes('apparel') || normalized.includes('boutique') || normalized.includes('clothing')) {
        return INDUSTRY_CONFIGS.boutique;
    }
    if (normalized.includes('health') || normalized.includes('beauty') || normalized.includes('pharmacy') || normalized.includes('medical') || normalized.includes('drug')) {
        return INDUSTRY_CONFIGS.pharmacy;
    }
    if (normalized.includes('food') || normalized.includes('beverage') || normalized.includes('restaurant') || normalized.includes('cafe') || normalized.includes('bar')) {
        return INDUSTRY_CONFIGS.restaurant;
    }
    if (normalized.includes('grocery') || normalized.includes('supermarket') || normalized.includes('bakery') || normalized.includes('mart')) {
        return INDUSTRY_CONFIGS.grocery;
    }
    
    return INDUSTRY_CONFIGS.default;
}

export function isFashionIndustry(industry?: string): boolean {
    if (!industry) return false;
    const normalized = industry.toLowerCase();
    return normalized.includes('fashion') || normalized.includes('apparel') || normalized.includes('boutique') || normalized.includes('clothing');
}
