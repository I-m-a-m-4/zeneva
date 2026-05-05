'use client';

import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { UserProfile } from '@/types';

type AuditAction =
    | 'product.create' | 'product.update' | 'product.delete' | 'product.bulk_update' | 'product.stock_adjustment'
    | 'sale.create' | 'sale.void'
    | 'customer.create' | 'customer.update' | 'customer.delete'
    | 'user.invite' | 'user.update_status' | 'user.impersonate' | 'user.stop_impersonate'
    | 'settings.update'
    | 'billing.grant_lifetime' | 'billing.extend_trial' | 'billing.assign_plan';

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
    user: UserProfile,
    event: AuditEvent
) => {
    try {
        const details: Record<string, any> = {
            entityName: event.entity.name || null,
            ...event.details,
        };

        // Remove undefined keys from details matching
        Object.keys(details).forEach(key => details[key] === undefined && delete details[key]);

        const logData = {
            businessId,
            userId: user?.id || 'unknown',
            userName: user?.name || 'Unknown User',
            userEmail: user?.email || 'N/A',
            userRole: user?.role || 'unknown',
            action: event.action,
            entityType: event.entity.type,
            entityId: event.entity.id,
            details,
            createdAt: serverTimestamp(),
        };

        const auditLogRef = collection(firestore, 'businessInstances', businessId, 'auditLogs');
        await addDoc(auditLogRef, logData);
    } catch (error) {
        // Log to console but don't block the user's action
        console.error('Failed to log audit event:', error);
    }
};
