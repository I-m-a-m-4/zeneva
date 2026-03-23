
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
import { PlusCircle, User, MoreHorizontal, AlertCircle, Trash2, Mail, UserCheck, UserX, ArrowUpDown, Clock, Calendar } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import type { UserProfile, Invitation, BusinessInstance } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddUserDialog from '@/components/users/add-user-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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

// Hook to get current user's profile, including businessId and role
function useCurrentUserProfile() {
  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  return { profile: userProfile, isLoading };
}

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

export default function UsersPage() {
  const { profile: currentUser, isLoading: isProfileLoading } = useCurrentUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = React.useState<Invitation | null>(null);
  const [userToUpdate, setUserToUpdate] = React.useState<{ user: UserProfile, action: 'activate' | 'deactivate' } | null>(null);
  const [sortBy, setSortBy] = React.useState<'active' | 'joined' | 'name'>('active');

  const businessDocRef = useMemoFirebase(() => {
    if (!currentUser?.businessId || !firestore) return null;
    return doc(firestore, 'businessInstances', currentUser.businessId);
  }, [currentUser?.businessId, firestore]);
  const { data: businessInstance, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);

  const usersQuery = useMemoFirebase(() => {
    if (!currentUser?.businessId || !firestore || currentUser.role !== 'admin') return null;
    return query(collection(firestore, "users"), where("businessId", "==", currentUser.businessId));
  }, [currentUser, firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const sortedUsers = React.useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      if (sortBy === 'active') {
        const dateA = a.lastSeen ? a.lastSeen.toDate() : new Date(0);
        const dateB = b.lastSeen ? b.lastSeen.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      } else if (sortBy === 'joined') {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [users, sortBy]);

  const invitationsQuery = useMemoFirebase(() => {
    if (!currentUser?.businessId || !firestore) return null;
    return query(collection(firestore, 'invitations'), where('businessId', '==', currentUser.businessId));
  }, [currentUser?.businessId, firestore]);
  const { data: invitations, isLoading: areInvitationsLoading } = useCollection<Invitation>(invitationsQuery);

  const isLoading = isProfileLoading || areUsersLoading || areInvitationsLoading || isBusinessLoading;
  const canManageUsers = currentUser?.role === 'admin';

  const handleRevokeInvitation = async () => {
    if (!invitationToRevoke || !firestore) return;
    const invitationRef = doc(firestore, 'invitations', invitationToRevoke.id);
    try {
      await deleteDoc(invitationRef);
      toast({ title: 'Invitation Revoked', description: `The invitation for ${invitationToRevoke.email} has been revoked.`, variant: 'success' });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not revoke invitation.', variant: 'destructive' });
    } finally {
      setInvitationToRevoke(null);
    }
  };

  const handleUpdateUserStatus = async () => {
    if (!userToUpdate || !firestore) return;
    const userRef = doc(firestore, 'users', userToUpdate.user.id);
    const newStatus = userToUpdate.action === 'activate' ? 'active' : 'inactive';

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User does not exist.");
        }
        transaction.update(userRef, { status: newStatus });
      });
      toast({ title: `User ${userToUpdate.action}d`, description: `${userToUpdate.user.name}'s account has been ${userToUpdate.action}d.`, variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not update user status.', variant: 'destructive' });
    } finally {
      setUserToUpdate(null);
    }
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="w-full md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User & Staff Management</CardTitle>
                <CardDescription>
                  Invite and manage roles for your business.
                </CardDescription>
              </div>
              <Button size="lg" className="h-9 gap-1" disabled={!canManageUsers} onClick={() => setIsAddUserDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Invite User
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1 ml-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Sort: {sortBy === 'active' ? 'Last Active' : sortBy === 'joined' ? 'Date Joined' : 'Name'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort Users By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortBy('active')}>
                    <Clock className="mr-2 h-4 w-4" /> Last Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('joined')}>
                    <Calendar className="mr-2 h-4 w-4" /> Date Joined
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    <User className="mr-2 h-4 w-4" /> Name
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {!canManageUsers && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Permission Denied</AlertTitle>
                <AlertDescription>
                  You do not have permission to manage users. Please contact your business administrator.
                </AlertDescription>
              </Alert>
            )}
            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <UserRowSkeleton />
                  <UserRowSkeleton />
                </TableBody>
              </Table>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className='sr-only'>Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => (
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
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastSeen ? formatDistanceToNow(user.lastSeen.toDate(), { addSuffix: true }) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'inactive' ? 'destructive' : 'outline'} className="capitalize">
                          {user.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                              disabled={!canManageUsers || currentUser.id === user.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {user.status === 'inactive' ? (
                              <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setUserToUpdate({ user, action: 'activate' }); }}>
                                <UserCheck className="mr-2 h-4 w-4" /> Activate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="cursor-pointer" onSelect={(e) => { e.preventDefault(); setUserToUpdate({ user, action: 'deactivate' }); }}>
                                <UserX className="mr-2 h-4 w-4" /> Deactivate User
                              </DropdownMenuItem>
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

        {canManageUsers && (
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
        )}
      </div>

      {currentUser?.businessId && (
        <AddUserDialog
          isOpen={isAddUserDialogOpen}
          onOpenChange={setIsAddUserDialogOpen}
          businessId={currentUser.businessId}
          businessName={businessInstance?.name || ''}
          inviterName={currentUser.name}
        />
      )}

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
                ? <>This will mark <strong>{userToUpdate?.user.name}</strong> as inactive, and they will not be able to log in. Their data will be preserved.</>
                : <>This will reactivate <strong>{userToUpdate?.user.name}</strong>'s account, allowing them to log in again.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateUserStatus} className={userToUpdate?.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {userToUpdate?.action === 'deactivate' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
