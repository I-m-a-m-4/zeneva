

export interface Product {
    id: string;
    businessId: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    imageUrl?: string;
    imageHint?: string;
    description?: string;
    lowStockThreshold?: number;
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
    referralCode?: string;
    referredBy?: string;
    referrals?: number;
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
        price: number
    }[];
    customer?: { id: string, name: string, email: string } | null;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer';
    createdAt: any; // Can be a Date or a Firestore Timestamp
    createdBy?: string;
}

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
        paymentBankAccountId?: string;
        paymentBankName?: string;
        paymentInstructions?: string;
        vendorPolicyEnabled?: boolean;
        vendorPolicyText?: string;
        loyaltyProgramEnabled?: boolean;
        pointsPerUnit?: number;
        loyaltyPointsForReward?: number;
        loyaltyRewardDiscountPercentage?: number;
        productCategories?: string[];
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

// User-specific notifications
export interface UserNotification {
    id: string;
    title: string;
    body: string;
    link?: string;
    read: boolean;
    createdAt: any;
}

export interface Referral {
    id: string;
    referrerId: string;
    referredUserId: string;
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
