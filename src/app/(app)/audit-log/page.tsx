
'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { AuditLog } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, User, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import FeatureGate from '@/components/shared/feature-gate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const actionIcons: { [key: string]: React.ElementType } = {
    'product': Package,
    'sale': FileText,
    'user': User,
};

function AuditLogPageContent() {
    const { business, isLoading: isPosLoading } = usePOS();
    const firestore = useFirestore();

    const auditLogQuery = useMemoFirebase(
        () => business?.id ? query(collection(firestore, 'businessInstances', business.id, 'auditLogs'), orderBy('createdAt', 'desc')) : null,
        [business?.id, firestore]
    );

    const { data: auditLogs, isLoading: isLoadingLogs } = useCollection<AuditLog>(auditLogQuery);
    const isLoading = isPosLoading || isLoadingLogs;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History /> Audit Log</CardTitle>
                <CardDescription>A chronological log of important events that have occurred in your business.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs && auditLogs.length > 0 ? (
                                auditLogs.map(log => {
                                    const entityType = log.action.split('.')[0];
                                    const Icon = actionIcons[entityType] || History;
                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8 hidden sm:flex">
                                                        <AvatarFallback>{log.userName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{log.userName}</div>
                                                        <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">
                                                    <Icon className="mr-1.5 h-3 w-3" />
                                                    {log.action.replace('.', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{log.details.entityName || log.entityType}</div>
                                                <div className="text-xs text-muted-foreground truncate" title={log.entityId}>
                                                    ID: {log.entityId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {log.createdAt ? format(log.createdAt.toDate(), 'PPp') : ''}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No audit events recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function AuditLogPage() {
    const { business } = usePOS();
    
    return (
        <div className="space-y-6">
            <PageTitle title="Audit Log" subtitle="Track important actions taken in your business." />
             <FeatureGate
                requiredPlan="pro"
                currentPlan={business?.plan}
                hasLifetimeAccess={business?.accessLevel === 'lifetime'}
                featureName="Audit Log"
                featureDescription="Keep a detailed, secure record of all critical system events to enhance security and accountability."
            >
                <AuditLogPageContent />
            </FeatureGate>
        </div>
    );
}
