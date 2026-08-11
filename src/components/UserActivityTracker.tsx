'use client';

import { useEffect, useRef } from 'react';
import { getCountryFromIP } from '@/lib/utils';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc, writeBatch, increment } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { AppConfig } from '@/lib/config';
import { useI18n } from '@/context/i18n-context';

/**
 * Routes are keyed on the user doc's `pageViews` map, so the key has to survive
 * Firestore field-path rules: no slashes, no dots, no empty segments. Dynamic
 * ids are collapsed so `/customers/abc123` and `/customers/def456` aggregate
 * into one `customers_:id` bucket instead of thousands of one-hit keys.
 */
function routeKey(pathname: string): string {
    const cleaned = pathname.split('?')[0].split('#')[0];
    const segments = cleaned.split('/').filter(Boolean);
    if (!segments.length) return 'root';

    const normalised = segments.map(seg => {
        const looksLikeId =
            seg.length >= 16 ||
            /^\d+$/.test(seg) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg);
        return looksLikeId ? ':id' : seg;
    });

    return normalised.join('_').replace(/[.$#[\]/]/g, '-').slice(0, 120);
}

/**
 * True only for a user's very first session on this device. Uses localStorage
 * (not sessionStorage) so opening a second tab doesn't look like a second
 * first-session. A reinstall or a new device re-flags it, which is acceptable:
 * the admin panel pairs this with the user's `createdAt` to spot real signups.
 *
 * Latched per session by the caller — this marks the device on first call, so
 * calling it again would report false and downgrade the flag mid-session.
 */
function claimFirstSession(uid: string): boolean {
    try {
        const key = `zeneva_seen_before_${uid}`;
        if (localStorage.getItem(key)) return false;
        localStorage.setItem(key, '1');
        return true;
    } catch {
        return false;
    }
}

export function UserActivityTracker() {
    const auth = useAuth();
    const firestore = useFirestore();
    const pathname = usePathname();
    const { locale } = useI18n();

    // Held in a ref rather than read from the closure so switching language does
    // not re-run the heartbeat effect and re-register its listeners. The next
    // scheduled flush picks up the new value at no extra cost.
    const localeRef = useRef(locale);
    localeRef.current = locale;

    // Buffers the routes seen since the last Firestore flush. Navigation is far
    // more frequent than the 5-minute heartbeat, so we batch rather than write
    // a document per click.
    const pendingRef = useRef<{ key: string; path: string; at: number }[]>([]);
    // The ordered route log for the whole session, written to the journey doc.
    // Kept separate from `pendingRef` because that one is drained on each flush.
    const sessionLogRef = useRef<{ path: string; at: number }[]>([]);
    const lastRouteRef = useRef<string | null>(null);
    // Latched by the first flush that sees a signed-in user; see claimFirstSession.
    const firstSessionRef = useRef<boolean>(false);
    const firstSessionClaimedRef = useRef<string | null>(null);

    // Record every navigation immediately; the flush below drains this buffer.
    useEffect(() => {
        if (!pathname) return;
        // Skip repeat renders of the same route (Next re-runs effects on
        // query-string changes too).
        if (pathname === lastRouteRef.current) return;
        lastRouteRef.current = pathname;
        const at = Date.now();
        pendingRef.current.push({ key: routeKey(pathname), path: pathname, at });
        // Cap the log so a very long session can't grow the journey doc past
        // Firestore's 1 MB limit.
        if (sessionLogRef.current.length < 400) {
            sessionLogRef.current.push({ path: pathname, at });
        }
    }, [pathname]);

    useEffect(() => {
        if (!auth || !firestore) return;

        const checkAndUpdateActivity = async (user: any) => {
            if (!user) return;

            // Claim the first-session flag once per uid, before any flush reads it.
            if (firstSessionClaimedRef.current !== user.uid) {
                firstSessionClaimedRef.current = user.uid;
                firstSessionRef.current = claimFirstSession(user.uid);
            }

            const userRef = doc(firestore, 'users', user.uid);
            const sessionIdKey = `zeneva_session_id_${user.uid}`;
            let sessionId = sessionStorage.getItem(sessionIdKey);

            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem(sessionIdKey, sessionId);
            }

            const sessionRef = doc(firestore, 'users', user.uid, 'sessions', sessionId);

            try {
                const lastUpdate = sessionStorage.getItem('last_user_activity_update');
                const now = Date.now();
                
                // Update if:
                // - Never updated this session
                // - It's been > 5 minutes
                if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
                    // Check if session is revoked only when we're going to update
                    const sessionSnap = await getDoc(sessionRef);
                    if (sessionSnap.exists() && sessionSnap.data().revoked) {
                        await signOut(auth);
                        sessionStorage.removeItem(sessionIdKey);
                        return;
                    }

                    const sessionExists = sessionSnap.exists();
                    const batch = writeBatch(firestore);
                    
                    const isTauriEnv = typeof window !== 'undefined' && (
                        !!(window as any).__TAURI__ || 
                        !!(window as any).__TAURI_INTERNALS__ || 
                        !!(window as any).__TAURI_METADATA__ || 
                        typeof (window as any).rpc !== 'undefined'
                    );
                    const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    let deviceType = 'Web';
                    if (isTauriEnv) {
                        deviceType = isMobile ? 'Mobile App' : 'Desktop App';
                    } else {
                        deviceType = isMobile ? 'Mobile' : 'Web';
                    }

                    // Detect country from IP once per session
                    let country = sessionStorage.getItem('zeneva_session_country') || '';
                    if (!country) {
                        country = await getCountryFromIP();
                        if (country) {
                            sessionStorage.setItem('zeneva_session_country', country);
                        }
                    }

                    batch.set(userRef, {
                        lastSeen: serverTimestamp(),
                        status: 'active',
                        deviceType,
                        userAgent: navigator.userAgent,
                        country: country || 'Unknown',
                        appVersion: AppConfig.version || 'unknown',
                        // One extra field on a write that already happens, so the
                        // admin language breakdown costs nothing beyond the
                        // existing heartbeat.
                        language: localeRef.current,
                        lastPage: pathname || '/'
                    }, { merge: true });

                    batch.set(sessionRef, {
                        sessionId,
                        userAgent: navigator.userAgent,
                        lastSeen: serverTimestamp(),
                        createdAt: sessionExists ? sessionSnap.data().createdAt : serverTimestamp(),
                        revoked: false,
                        deviceInfo: {
                            platform: navigator?.platform || 'Unknown',
                            vendor: navigator?.vendor || 'Unknown',
                            language: navigator?.language || 'Unknown'
                        }
                    }, { merge: true });

                    // ——— Page-visit behavior tracking ———
                    // Drains the routes accumulated since the last flush into the
                    // same batch, so behavior costs nothing beyond the existing
                    // 5-minute heartbeat. pageViews is a per-route counter on the
                    // user doc; the journey doc keeps the ordered route log for the
                    // whole session (first-session onboarding, top pages, funnels).
                    const pending = pendingRef.current;
                    if (pending.length > 0) {
                        const totals = new Map<string, number>();
                        pending.forEach(p => totals.set(p.key, (totals.get(p.key) || 0) + 1));
                        pendingRef.current = [];

                        const pageViewUpdate: Record<string, any> = {};
                        totals.forEach((count, key) => { pageViewUpdate[`pageViews.${key}`] = increment(count); });
                        pageViewUpdate.pagesVisited = increment([...totals.values()].reduce((a, b) => a + b, 0));
                        batch.set(userRef, pageViewUpdate, { merge: true });
                    }

                    const routeLog = sessionLogRef.current.slice(-400);
                    if (routeLog.length > 0) {
                        const journeyRef = doc(firestore, 'users', user.uid, 'journey', sessionId);
                        // Latched once so the flag stays true for the whole session
                        // even though this block runs on every heartbeat flush.
                        const firstSession = firstSessionRef.current;
                        batch.set(journeyRef, {
                            uid: user.uid,
                            sessionId,
                            startedAt: routeLog[0] ? new Date(routeLog[0].at) : new Date(),
                            routes: routeLog,
                            endedAt: serverTimestamp(),
                            deviceType,
                            // Flags the very first session after signup — that is the
                            // run the admin onboarding panel reads to see where a brand
                            // new user actually went first.
                            isFirstSession: firstSession,
                        }, { merge: true });
                    }

                    await batch.commit();
                    sessionStorage.setItem('last_user_activity_update', now.toString());
                    console.log("User session updated successfully");
                }
            } catch (error: any) {
                if (error?.message?.includes('Missing or insufficient permissions') || error?.code === 'permission-denied') {
                    // Silently ignore during logout as auth state is cleared before the request finishes
                    return;
                }
                console.error("Error updating user activity/session:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                checkAndUpdateActivity(user);
            }
        });

        // Trigger on navigation
        if (auth.currentUser) {
            checkAndUpdateActivity(auth.currentUser);
        }

        // Trigger continuously while tab is active
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible' && auth.currentUser) {
                checkAndUpdateActivity(auth.currentUser);
            }
        }, 60 * 1000);

        // Fire-and-forget flush on unload. The 5-minute heartbeat gate would
        // otherwise drop a brand-new user's whole first session if they closed
        // the app before the next tick — which is exactly the run the admin
        // onboarding view cares about most.
        const flushOnUnload = () => {
            const uid = auth.currentUser?.uid;
            if (!uid || !firestore) return;

            const pageViewUpdate: Record<string, any> = {};
            const pending = pendingRef.current;
            if (pending.length > 0) {
                const totals = new Map<string, number>();
                pending.forEach(p => totals.set(p.key, (totals.get(p.key) || 0) + 1));
                totals.forEach((count, key) => { pageViewUpdate[`pageViews.${key}`] = increment(count); });
                pageViewUpdate.pagesVisited = increment([...totals.values()].reduce((a, b) => a + b, 0));
                pendingRef.current = [];
            }

            const routeLog = sessionLogRef.current.slice(-400);
            if (routeLog.length > 0) {
                const sid = sessionStorage.getItem(`zeneva_session_id_${uid}`);
                if (sid) {
                    setDoc(doc(firestore, 'users', uid, 'journey', sid), {
                        uid,
                        sessionId: sid,
                        routes: routeLog,
                        endedAt: new Date(),
                        isFirstSession: firstSessionRef.current,
                    }, { merge: true }).catch(() => {});
                }
            }

            if (Object.keys(pageViewUpdate).length > 0) {
                setDoc(doc(firestore, 'users', uid), pageViewUpdate, { merge: true }).catch(() => {});
            }
        };
        window.addEventListener('beforeunload', flushOnUnload);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
            window.removeEventListener('beforeunload', flushOnUnload);
        };
    }, [auth, firestore, pathname]);

    return null;
}
