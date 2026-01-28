
export interface Product {
    id: string;
    businessId: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    costPrice?: number;
    stock: number;
    imageUrl?: string;
    imageHint?: string;
    description?: string;
    lowStockThreshold?: number;
    createdAt?: any;
    expiryDate?: any;
}
export type InventoryItem = Product;
export interface CartItem {
    product: Product;
    quantity: number;
}

export type TopSellingItem = Product & {
    quantitySold: number;
};

export type UserRole = 'admin' | 'manager' | 'vendor_operator';

export interface UserProfile {
    id: string;
    businessId: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    createdAt?: any;
    surveyCompleted?: boolean;
    status?: 'active' | 'inactive' | 'deleted';
    lastSeen?: any;
}


export interface Customer {
    id: string;
    businessId: string;
    name: string;
    email: string;
    phone?: string;
    loyaltyPoints?: number;
    createdAt?: any;
}

export interface Receipt {
    id: string;
    businessId: string;
    receiptNumber?: string;
    items: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
        costPrice?: number;
    }[];
    customer?: { id: string, name: string, email: string } | null;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    totalCost?: number;
    profit?: number;
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer';
    createdAt: any; // Can be a Date or a Firestore Timestamp
    createdBy?: string;
}

export interface OnlineOrder {
    id: string;
    businessId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    items: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    total: number;
    status: 'pending' | 'paid' | 'shipped' | 'cancelled';
    paymentMethod?: 'Paystack' | 'Bank Transfer';
    paymentReference?: string;
    createdAt: any;
}

export interface AISuggestion {
    title: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
}

export interface AISuggestions {
    suggestions: AISuggestion[];
    createdAt: any; // Firestore Timestamp
}

export type TopPerformer = {
    productId: string;
    name: string;
    reason: string;
};

export type Underperformer = {
    productId: string;
    name: string;
    reason: string;
};

export type RestockSuggestion = {
    productId: string;
    name: string;
    reason: string;
};

export type BusinessAnalysis = {
    health: {
        score: number;
        status: string;
        summary: string;
    };
    keyInsights: {
        title: string;
        description: string;
        actionText: string;
        link: string;
    }[];
    actionableSuggestions: {
        priority: number;
        title: string;
        description: string;
        actionText: string;
        link: string;
    }[];
    whatIsWorking?: TopPerformer[];
    whatIsWastingMoney?: Underperformer[];
    whatToRestock?: RestockSuggestion[];
    createdAt: any; // Can be Date or Firestore Timestamp
};


export interface BusinessInstance {
    id: string;
    name: string;
    address?: string;
    ownerId: string;
    createdAt: any; // Firestore Timestamp
    trialExpiresAt?: any; // Firestore Timestamp
    plan?: 'starter' | 'pro' | 'business';
    accessLevel?: 'lifetime';
    status?: 'active' | 'deleted';
    deletedAt?: any;
    settings?: {
        phone?: string;
        email?: string;
        currency?: string;
        timezone?: string;
        defaultTaxRate?: number;
        primaryColor?: string;
        logoUrl?: string;
        paymentBankAccountId?: string;
        paymentBankName?: string;
        paymentInstructions?: string;
        paystackSubaccount?: string;
        vendorPolicyEnabled?: boolean;
        vendorPolicyText?: string;
        loyaltyProgramEnabled?: boolean;
        pointsPerUnit?: number;
        loyaltyPointsForReward?: number;
        loyaltyRewardDiscountPercentage?: number;
        productCategories?: string[];
        aiTroubleshootSuggestions?: AISuggestions;
        businessAnalysis?: BusinessAnalysis;
        publicStore?: {
            enabled?: boolean;
            headline?: string;
            slug?: string;
            bannerImageUrl?: string;
            desktopColumns?: 3 | 4 | 5;
            footerText?: string;
            description?: string;
            socialTwitter?: string;
            socialInstagram?: string;
            socialFacebook?: string;
            socialWhatsapp?: string;
            hideOutOfStock?: boolean;
            officeLocations?: string;
            contactPhone?: string;
            contactEmail?: string;
            businessHours?: string;
            googleMapsLink?: string;
        },
        industry?: string;
        language?: string;
        inventoryStartDate?: any;
        fiscalYearStart?: string;
        state?: string;
        country?: string;
    };
}

export interface Invitation {
    id: string;
    businessId: string;
    email: string;
    name: string;
    role: 'manager' | 'vendor_operator';
    createdAt: any; // Firestore timestamp
}

export interface Purchase {
    id: string;
    userId: string;
    businessId: string;
    plan: 'Pro' | 'Business';
    amount: number;
    currency: 'NGN';
    timestamp: any; // Firestore Timestamp
    userProfile?: UserProfile; // For admin dashboard display
}

export interface SubscriptionHistory {
    id: string;
    action: string;
    amount: number;
    currency: 'NGN';
    timestamp: any; // Firestore Timestamp
}

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    imageUrl?: string;
    authorId: string;
    authorName: string;
    published: boolean;
    createdAt: any;
    updatedAt: any;
}

// Platform-wide notifications sent by admin
export interface AdminNotification {
    id: string;
    title: string;
    body: string;
    sentBy: string;
    createdAt: any;
}

export interface SupportThread {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    status: 'open' | 'closed';
    lastMessageAt: any; // Timestamp
    lastMessageSnippet: string;
    isReadByAdmin: boolean;
    createdAt: any;
}

export interface SupportMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any; // Timestamp
}


export interface PressArticle {
    title: string;
    publication: string;
    logoUrl?: string;
    url: string;
}

export interface AuditLog {
    id: string;
    businessId: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: string; // e.g., 'product.create', 'sale.void'
    entityType: string; // e.g., 'Product', 'Receipt'
    entityId: string;
    details: Record<string, any>; // e.g., { name: 'New Product' } or { changes: [...] }
    createdAt: any; // Firestore Timestamp
}

    