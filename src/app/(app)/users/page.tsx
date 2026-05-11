
'use client';

import * as React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, User, MoreHorizontal, AlertCircle, Trash2, Mail, UserCheck, UserX, Loader2, Globe } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, Invitation } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import AddUserDialog from '@/components/users/add-user-dialog';
import UserPermissionsDialog from '@/components/users/user-permissions-dialog';
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageTitle from '@/components/shared/page-title';
import { usePOS } from '@/context/pos-context';


function UserRowSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 w-full">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-5 w-full" />
            </TableCell>
            <TableCell>
                <Skeleton className="h-6 w-24" />
            </TableCell>
            <TableCell>
                <Skeleton className="h-6 w-24" />
            </TableCell>
            <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
            </TableCell>
        </TableRow>
    )
}

function UsersPageSkeleton() {
    return (
        <>
            <PageTitle title="User & Staff Management" subtitle="Invite and manage roles for your business." />
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="w-full md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <Skeleton className="h-7 w-64" />
                                <Skeleton className="h-4 w-80 mt-2" />
                            </div>
                            <Skeleton className="h-9 w-28" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <UserRowSkeleton />
                                <UserRowSkeleton />
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72 mt-2" />
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground p-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                        <p className="mt-4">Loading invitations...</p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function UserManagementDashboard({ businessId, currentUserId, inviterName }: { businessId: string, currentUserId: string, inviterName: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { triggerRefresh } = usePOS();
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
    const [invitationToRevoke, setInvitationToRevoke] = React.useState<Invitation | null>(null);
    const [userToUpdate, setUserToUpdate] = React.useState<{ user: UserProfile, action: 'activate' | 'deactivate' } | null>(null);
    const [userRoleToUpdate, setUserRoleToUpdate] = React.useState<{ user: UserProfile, newRole: UserRole } | null>(null);
    const [userPermissionsToUpdate, setUserPermissionsToUpdate] = React.useState<UserProfile | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = React.useState(false);
    const [openMenuUserId, setOpenMenuUserId] = React.useState<string | null>(null);

    const { business: businessInstance, currentUserProfile, isLoading: isPosLoading, users } = usePOS();
    const areUsersLoading = false; // Handled by root lifecycle

    const invitationsQuery = useMemoFirebase(() => {
        if (!businessId || !firestore) return null;
        return query(collection(firestore, 'invitations'), where('businessId', '==', businessId));
    }, [businessId, firestore]);
    const { data: invitations, isLoading: areInvitationsLoading } = useCollection<Invitation>(invitationsQuery);
    const forceRefresh = triggerRefresh; // Bind locally

    const isLoading = isPosLoading || areUsersLoading || areInvitationsLoading;

    const staffUsers = React.useMemo(() => {
        if (!users) return [];
        // Sort current logged-in user to the top of the list, then sort others alphabetically by name
        return [...users].sort((a, b) => {
            if (a.id === currentUserId) return -1;
            if (b.id === currentUserId) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [users, currentUserId]);

    const totalUsers = (users?.length || 0) + (invitations?.length || 0);
    const planLimit = businessInstance?.plan === 'business' ? 1000000 : (businessInstance?.plan === 'pro' ? 5 : 1);
    const isLimitReached = totalUsers >= planLimit;

    const handleRevokeInvitation = async () => {
        if (!invitationToRevoke || !firestore) return;
        const invitationRef = doc(firestore, 'invitations', invitationToRevoke.id);
        try {
            await deleteDoc(invitationRef);
            toast({ title: 'Invitation Revoked', description: `The invitation for ${invitationToRevoke.email} has been revoked.`, variant: 'success' });
            forceRefresh();
        } catch (e) {
            toast({ title: 'Error', description: 'Could not revoke invitation.', variant: 'destructive' });
        } finally {
            setInvitationToRevoke(null);
        }
    };

    const handleUpdateUserStatus = async () => {
        if (!userToUpdate || !firestore) return;
        
        if (!navigator.onLine) {
            toast({
                title: 'Offline',
                description: 'Updating user status requires an internet connection.',
                variant: 'destructive'
            });
            return;
        }

        setIsUpdatingStatus(true);
        const userRef = doc(firestore, 'users', userToUpdate.user.id);
        const newStatus = userToUpdate.action === 'activate' ? 'active' : 'inactive';

        try {
            await updateDoc(userRef, { status: newStatus });
            toast({ title: `User ${userToUpdate.action}d`, description: `${userToUpdate.user.name}'s account has been ${userToUpdate.action}d.`, variant: 'success' });
            triggerRefresh();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Could not update user status.', variant: 'destructive' });
        } finally {
            setUserToUpdate(null);
            setIsUpdatingStatus(false);
        }
    }

    const handleUpdateUserRole = async () => {
        if (!userRoleToUpdate || !firestore) return;

        if (!navigator.onLine) {
            toast({
                title: 'Offline',
                description: 'Changing user roles requires an internet connection.',
                variant: 'destructive'
            });
            return;
        }

        setIsUpdatingRole(true);
        const userRef = doc(firestore, 'users', userRoleToUpdate.user.id);

        try {
            await updateDoc(userRef, { role: userRoleToUpdate.newRole });
            
            // Send notification to the updated user
            const notifRef = collection(firestore, `users/${userRoleToUpdate.user.id}/notifications`);
            await addDoc(notifRef, {
                title: "Role Access Updated",
                body: `Your access level has been changed to ${userRoleToUpdate.newRole.replace('_', ' ')}. Please refresh your dashboard to see new features.`,
                createdAt: serverTimestamp(),
                read: false,
                type: 'system'
            });

            toast({ 
                title: 'Role Updated', 
                description: `${userRoleToUpdate.user.name}'s role has been changed to ${userRoleToUpdate.newRole.replace('_', ' ')}.`, 
                variant: 'success' 
            });
            triggerRefresh();
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Could not update user role.', variant: 'destructive' });
        } finally {
            setUserRoleToUpdate(null);
            setIsUpdatingRole(false);
        }
    }

    return (
        <>
            <PageTitle title="User & Staff Management" subtitle="Invite and manage roles for your business." />
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2 border-primary/10 bg-primary/5 shadow-none overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-semibold">Role Permissions Guide</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Understand the capabilities and access levels assigned to each role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-[10px] h-4.5 px-1.5">Admin / Owner</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <strong>Full Authority:</strong> Can manage business settings, invite staff, change roles, and handle all inventory and financial records.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5">Manager</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <strong>Operations Lead:</strong> Full inventory management (create, update, delete) and customer records. Restricted from high-level financial reporting and revenue analytics.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 bg-background">Vendor Operator</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <strong>Store Staff:</strong> Strictly authorized to record sales and manage POS transactions. No access to product creation, stock adjustments, or financial reports.
                            </p>
                        </div>
                        <Separator className="my-2" />
                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                            * Baseline capabilities can be customized or extended for individual staff members using the <strong>Manage Permissions</strong> action in the staff list.
                        </p>
                    </CardContent>
                </Card>

                <Card className="w-full md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Your Staff</CardTitle>
                                <CardDescription>
                                    A list of all users in your business.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                {businessInstance && (
                                    <div className="hidden lg:flex flex-col items-end text-sm">
                                        <span className="font-medium">
                                            {totalUsers} / {planLimit === Infinity ? '∞' : planLimit} Users
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Plan: {businessInstance.plan || 'starter'}</span>
                                    </div>
                                )}
                                <Button size="lg" className="h-9 gap-1" onClick={() => setIsAddUserDialogOpen(true)} disabled={isLimitReached}>
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Invite User
                                    </span>
                                </Button>
                            </div>
                        </div>
                        {isLimitReached && (
                            <Alert variant="warning" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Plan Limit Reached</AlertTitle>
                                <AlertDescription>
                                    You have reached the maximum number of users for your current plan. Please upgrade to invite more team members.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <UserRowSkeleton />
                                    <UserRowSkeleton />
                                </TableBody>
                            </Table>
                        ) : staffUsers && staffUsers.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead><span className='sr-only'>Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.name}</div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                                    {user.role.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                                                    {user.status || 'active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu modal={false} open={openMenuUserId === user.id} onOpenChange={(open) => setOpenMenuUserId(open ? user.id : null)}>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            aria-haspopup="true"
                                                            size="icon"
                                                            variant="ghost"
                                                            disabled={currentUserId === user.id}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        {user.status === 'inactive' ? (
                                                            <DropdownMenuItem className="cursor-pointer" onSelect={() => setUserToUpdate({ user, action: 'activate' })}>
                                                                <UserCheck className="mr-2 h-4 w-4" /> Activate User
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <>
                                                                {currentUserProfile?.role === 'admin' && user.role !== 'admin' && (
                                                                    <DropdownMenuSub>
                                                                        <DropdownMenuSubTrigger className="cursor-pointer">
                                                                            <Shield className="mr-2 h-4 w-4" /> Change Role
                                                                        </DropdownMenuSubTrigger>
                                                                        <DropdownMenuPortal>
                                                                            <DropdownMenuSubContent>
                                                                                <DropdownMenuItem 
                                                                                    disabled={user.role === 'manager'}
                                                                                    onSelect={() => setUserRoleToUpdate({ user, newRole: 'manager' })}
                                                                                >
                                                                                    <ShieldCheck className="mr-2 h-4 w-4" /> Manager
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem 
                                                                                    disabled={user.role === 'vendor_operator'}
                                                                                    onSelect={() => setUserRoleToUpdate({ user, newRole: 'vendor_operator' })}
                                                                                >
                                                                                    <ShieldAlert className="mr-2 h-4 w-4" /> Vendor Operator
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuSubContent>
                                                                        </DropdownMenuPortal>
                                                                    </DropdownMenuSub>
                                                                )}
                                                                {currentUserProfile?.role === 'admin' && (
                                                                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setUserPermissionsToUpdate(user)}>
                                                                        <Shield className="mr-2 h-4 w-4" /> Manage Permissions
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={() => setUserToUpdate({ user, action: 'deactivate' })}>
                                                                    <UserX className="mr-2 h-4 w-4" /> Deactivate User
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-12 border-2 border-dashed rounded-lg">
                                <User className="h-12 w-12 text-muted-foreground" />
                                <h3 className="text-xl font-semibold mt-4">No Staff Found</h3>
                                <p className="text-muted-foreground mt-2 mb-4">Invite your first team member to get started.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Pending Invitations</CardTitle>
                        <CardDescription>These users have been invited but have not yet signed up.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground">Loading invitations...</div>
                        ) : invitations && invitations.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Invited</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map(invitation => (
                                        <TableRow key={invitation.id}>
                                            <TableCell className="font-medium">{invitation.email}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{invitation.role.replace('_', ' ')}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground">{invitation.createdAt ? formatDistanceToNow(invitation.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="destructive" size="sm" onClick={() => setInvitationToRevoke(invitation)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                <Mail className="mx-auto h-12 w-12 opacity-50" />
                                <p className="mt-4">No pending invitations.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {businessId && (
                <AddUserDialog
                    isOpen={isAddUserDialogOpen}
                    onOpenChange={setIsAddUserDialogOpen}
                    businessId={businessId}
                    businessName={businessInstance?.name || ''}
                    inviterName={inviterName}
                    onSuccess={forceRefresh}
                    currentUserCount={users?.length || 0}
                    pendingInvitationCount={invitations?.length || 0}
                />
            )}

            <UserPermissionsDialog
                isOpen={!!userPermissionsToUpdate}
                onOpenChange={(open) => !open && setUserPermissionsToUpdate(null)}
                user={userPermissionsToUpdate}
                onSuccess={forceRefresh}
            />

            <AlertDialog open={!!invitationToRevoke} onOpenChange={(open) => !open && setInvitationToRevoke(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will revoke the invitation for <strong>{invitationToRevoke?.email}</strong>. They will not be able to join your business unless you invite them again.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevokeInvitation} className="bg-destructive hover:bg-destructive/90">Revoke</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!userToUpdate} onOpenChange={(open) => !open && setUserToUpdate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToUpdate?.action === 'deactivate'
                                ? <>This will mark <strong>{userToUpdate?.user?.name}</strong> as inactive, and they will not be able to log in. Their data will be preserved.</>
                                : <>This will reactivate <strong>{userToUpdate?.user?.name}</strong>'s account, allowing them to log in again.</>
                            }
                            <span className="mt-4 text-amber-600 font-medium flex items-center gap-1.5 text-xs">
                                <Globe className="h-3.5 w-3.5" />
                                This action requires an active internet connection.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateUserStatus} disabled={isUpdatingStatus} className={userToUpdate?.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}>
                            {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {userToUpdate?.action === 'deactivate' ? 'Deactivate' : 'Activate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!userRoleToUpdate} onOpenChange={(open) => !open && setUserRoleToUpdate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change User Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to change <strong>{userRoleToUpdate?.user?.name}</strong>&apos;s role to <strong>{userRoleToUpdate?.newRole.replace('_', ' ')}</strong>?
                            <br /><br />
                            <span className="text-amber-600 font-medium flex items-center gap-1.5 text-xs">
                                <Globe className="h-3.5 w-3.5" />
                                This action requires an active internet connection.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpdatingRole}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUpdateUserRole} disabled={isUpdatingRole}>
                            {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Change Role
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function UsersPage() {
    const { currentUserProfile: currentUser, isLoading: isPosLoading } = usePOS();
    const isLoading = isPosLoading || !currentUser?.businessId;

    if (isLoading) {
        return <UsersPageSkeleton />;
    }

    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        return (
            <>
                <PageTitle title="User & Staff Management" subtitle="Invite and manage roles for your business." />
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Permission Denied</AlertTitle>
                    <AlertDescription>
                        You do not have the required permissions to manage users. Please contact your business administrator.
                    </AlertDescription>
                </Alert>
            </>
        );
    }

    return <UserManagementDashboard businessId={currentUser.businessId} currentUserId={currentUser.id} inviterName={currentUser.name} />;
}
