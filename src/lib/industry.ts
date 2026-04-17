
export type IndustryType = 'boutique' | 'pharmacy' | 'grocery' | 'bakery' | 'restaurant' | 'default';

export interface IndustryConfig {
    label: string;
    measurementLabels: string[];
    defaultUnit: string;
    hasStock: boolean;
    hasExpiry: boolean;
    productFields: {
        label: string;
        key: string;
        placeholder: string;
    }[];
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
    boutique: {
        label: 'Boutique & Tailoring',
        measurementLabels: ['Neck', 'Chest/Bust', 'Waist', 'Hips', 'Shoulder', 'Sleeve', 'Length (Top)', 'Length (Bottom)'],
        defaultUnit: 'Piece',
        hasStock: true,
        hasExpiry: false,
        productFields: [
            { label: 'Material/Fabric', key: 'material', placeholder: 'e.g. Cotton, Silk' },
            { label: 'Size/Fit', key: 'variantValue', placeholder: 'e.g. XL, Slim Fit' }
        ]
    },
    pharmacy: {
        label: 'Pharmacy & Health',
        measurementLabels: ['Age Group', 'Blood Type', 'Allergies', 'Chronic Conditions', 'Primary Care Dr.'],
        defaultUnit: 'Pack',
        hasStock: true,
        hasExpiry: true,
        productFields: [
            { label: 'Dosage', key: 'dosage', placeholder: 'e.g. 500mg' },
            { label: 'Manufacturer', key: 'manufacturer', placeholder: 'e.g. Pfizer' }
        ]
    },
    grocery: {
        label: 'Grocery & Supermarket',
        measurementLabels: ['Preferred Brand', 'Dietary Pref', 'Frequency', 'Delivery Notes'],
        defaultUnit: 'pcs',
        hasStock: true,
        hasExpiry: true,
        productFields: [
            { label: 'Weight/Volume', key: 'weightVolume', placeholder: 'e.g. 1kg, 750ml' },
            { label: 'Brand', key: 'brand', placeholder: 'e.g. Nestle' }
        ]
    },
    bakery: {
        label: 'Bakery & Cafe',
        measurementLabels: ['Allergies', 'Preferred Sweetness', 'Favorite Flavor', 'Special Occasions'],
        defaultUnit: 'pcs',
        hasStock: true,
        hasExpiry: true,
        productFields: [
            { label: 'Flavor/Type', key: 'variantValue', placeholder: 'e.g. Chocolate, Vanilla' },
            { label: 'Packaging', key: 'packaging', placeholder: 'e.g. Box of 6' }
        ]
    },
    restaurant: {
        label: 'Restaurant & Bar',
        measurementLabels: ['Dietary Restrictions', 'Spice Tolerance', 'Drink Preference', 'Seating Pref'],
        defaultUnit: 'Portion',
        hasStock: true,
        hasExpiry: false,
        productFields: [
            { label: 'Spice Level', key: 'spiceLevel', placeholder: 'e.g. Hot, Mild' },
            { label: 'Add-ons', key: 'variantValue', placeholder: 'e.g. Extra Cheese' }
        ]
    },
    default: {
        label: 'General Retail',
        measurementLabels: ['Customer Note', 'Reference', 'Engagement Level'],
        defaultUnit: 'Unit',
        hasStock: true,
        hasExpiry: false,
        productFields: [
            { label: 'Model/Variant', key: 'variantValue', placeholder: 'e.g. V2, Red' }
        ]
    }
};

export function getIndustryConfig(industry?: string): IndustryConfig {
    if (!industry) return INDUSTRY_CONFIGS.default;
    
    const normalized = industry.toLowerCase();
    
    if (normalized.includes('fashion') || normalized.includes('apparel') || normalized.includes('boutique')) {
        return INDUSTRY_CONFIGS.boutique;
    }
    if (normalized.includes('health') || normalized.includes('beauty') || normalized.includes('pharmacy') || normalized.includes('medical')) {
        return INDUSTRY_CONFIGS.pharmacy;
    }
    if (normalized.includes('food') || normalized.includes('beverage') || normalized.includes('restaurant') || normalized.includes('cafe')) {
        return INDUSTRY_CONFIGS.restaurant;
    }
    if (normalized.includes('grocery') || normalized.includes('supermarket') || normalized.includes('bakery')) {
        return INDUSTRY_CONFIGS.grocery;
    }
    
    return INDUSTRY_CONFIGS.default;
}
