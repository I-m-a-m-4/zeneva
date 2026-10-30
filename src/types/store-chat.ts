export interface StoreChatProductAttachment {
    productId: string;
    productName: string;
    price: number;
    stock: number;
    isInStock: boolean;
    sku?: string;
    imageUrl?: string | null;
}

export interface StoreChatMessage {
    id: string;
    conversationId: string;
    sender: 'customer' | 'staff';
    senderName: string;
    senderId?: string;
    text: string;
    productAttachment?: StoreChatProductAttachment | null;
    createdAt: any; // Firestore Timestamp or Date
    read?: boolean;
}

export interface StoreConversation {
    id: string;
    businessId: string;
    customerName: string;
    customerPhone?: string;
    lastMessage: string;
    lastSender: 'customer' | 'staff';
    unreadCountStaff: number;
    unreadCountCustomer: number;
    status: 'active' | 'resolved';
    createdAt: any;
    updatedAt: any;
}

