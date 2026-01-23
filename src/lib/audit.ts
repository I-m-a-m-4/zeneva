
'use client';

import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { UserProfile, User } from '@/types';

type AuditAction = 
    | 'product.create' | 'product.update' | 'product.delete'
    | 'sale.create' | 'sale.void'
    | 'customer.create' | 'customer.update' | 'customer.delete'
    | 'user.invite' | 'user.update_status'
    | 'settings.update';

interface AuditEvent {
    action: AuditAction;
    entity: {
        type: string;
        id: string;
        name?: string;
    };
    details?: Record<string, any>;
}

export const logAuditEvent = async (
    firestore: Firestore,
    businessId: string,
    user: UserProfile | User,
    event: AuditEvent
) => {
    try {
        const logData = {
            businessId,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            action: event.action,
            entityType: event.entity.type,
            entityId: event.entity.id,
            details: {
                entityName: event.entity.name,
                ...event.details,
            },
            createdAt: serverTimestamp(),
        };
        const auditLogRef = collection(firestore, 'businessInstances', businessId, 'auditLogs');
        await addDoc(auditLogRef, logData);
    } catch (error) {
        // Log to console but don't block the user's action
        console.error('Failed to log audit event:', error);
    }
};
