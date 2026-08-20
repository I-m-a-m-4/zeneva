import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { notifyAdminsOfSubscription } from '@/lib/server/notifications';
import { creditPack } from '@/lib/credit-packs';
import { AI_CREDIT_LEDGER_COLLECTION } from '@/lib/ai-credit-ledger';

/**
 * POST /api/webhooks/dodo — Dodo Payments Standard Webhooks receiver.
 *
 * This is the only thing that grants anything after a USD payment: the client
 * never writes `plan`/`trialExpiresAt`/`aiBonusCredits` (they are rule-locked to
 * the platform owner), so if this endpoint is not reachable the customer is
 * charged and gets nothing. Two kinds of purchase arrive here, told apart by
 * `metadata.kind` — a subscription, and a one-off Zen AI credit pack.
 *
 * It sat as `route.ts.bak` alongside the checkout route, which meant Next.js
 * never registered it and Dodo's deliveries hit the HTML 404 page. Restoring
 * checkout without restoring this would take money and grant nothing.
 *
 * The build-injected `dynamic = 'force-static'` it used to carry is invalid on
 * a POST handler and must not come back.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This is the secret you get from the Dodo Dashboard -> Developers -> Webhooks
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = req.headers;

    const webhookId = headers.get('webhook-id');
    const webhookSignature = headers.get('webhook-signature');
    const webhookTimestamp = headers.get('webhook-timestamp');

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return new NextResponse('Missing required webhook headers', { status: 400 });
    }

    if (!DODO_WEBHOOK_SECRET) {
      console.error('DODO_WEBHOOK_SECRET is not configured in .env.local');
      // We return 200 during initial setup so Dodo can verify the URL, 
      // but you MUST add the secret for actual security.
      return NextResponse.json({ received: true, warning: 'No secret configured' });
    }

    // Standard Webhooks Verification logic
    // The signature is an HMAC SHA256 of: webhook-id + '.' + webhook-timestamp + '.' + body
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
    
    // 1. Replay Attack Protection: Check if timestamp is within 5 minutes (300 seconds)
    const toleranceSeconds = 300; // 5 minutes
    const timestampSeconds = parseInt(webhookTimestamp, 10);
    const currentSeconds = Math.floor(Date.now() / 1000);
    
    if (Math.abs(currentSeconds - timestampSeconds) > toleranceSeconds) {
        console.error('Webhook rejected: Timestamp drift exceeds tolerance window.');
        return new NextResponse('Request expired', { status: 401 });
    }

    // 2. Cryptographic Validation
    // Webhook secrets from Standard Webhooks need to be decoded from base64.
    const secret = DODO_WEBHOOK_SECRET.replace('whsec_', '');
    const secretBuffer = Buffer.from(secret, 'base64');
    
    const hmac = crypto.createHmac('sha256', secretBuffer);
    hmac.update(signedContent);
    const expectedSignature = hmac.digest('base64');

    /*
     * Standard Webhooks sends one or more signatures separated by a space:
     * "v1,SIGNATURE1 v1,SIGNATURE2" (both are present during a secret
     * rotation), so any one of them matching is a pass.
     *
     * Compared with `timingSafeEqual` rather than `===`. String equality
     * returns as soon as two bytes differ, so the time it takes to reject a
     * forgery reveals how much of the prefix was right — enough to recover a
     * valid signature byte by byte, which on this endpoint would let a
     * stranger grant themselves any plan.
     */
    const expectedBuffer = Buffer.from(expectedSignature);
    const isValid = webhookSignature.split(' ').some(sig => {
      const [version, signature] = sig.split(',');
      if (version !== 'v1' || !signature) return false;
      const candidate = Buffer.from(signature);
      // Lengths must match before comparing; timingSafeEqual throws otherwise.
      if (candidate.length !== expectedBuffer.length) return false;
      return crypto.timingSafeEqual(candidate, expectedBuffer);
    });

    if (!isValid) {
      console.error('Invalid Dodo Webhook signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('[dodo-webhook] Verified:', event.type);

    // --- Handle different event types ---
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated':
        console.log(`Processing ${event.type} for business:`, event.data?.business_id);
        // TODO: Update business subscription status in Firestore
        // const { business_id, status, plan_id } = event.data;
        break;
        
      case 'payment.succeeded': {
        const pData = event.data;
        console.log('Processing Payment Success:', pData?.payment_id, 'Amount:', pData?.total_amount);
        
        const metadata = pData?.metadata || {};
        const { businessId, planId, cycleMonths, packId } = metadata;

        if (!adminFirestore) {
          console.error('Firestore admin failed to initialize, cannot process payment event.');
          break;
        }

        /*
         * Credit packs, checked BEFORE the plan gate below.
         *
         * A pack has no `planId`, so `if (businessId && planId)` skips it — the
         * customer would be charged, the webhook would log "without valid
         * metadata", and nothing would be granted. `metadata.kind` is set by
         * `api/dodo/checkout`; `packId` alone is accepted too so a session created
         * before `kind` existed still works.
         *
         * The credit figure is re-derived from `CREDIT_PACKS` rather than read out
         * of `metadata.credits`. Metadata is not a price list, and a webhook that
         * grants whatever number it is handed is one forged request away from
         * unlimited credits.
         */
        if (metadata.kind === 'credits' || packId) {
          if (!businessId) {
            console.error('[dodo-webhook] Credit purchase with no businessId in metadata. Cannot grant.');
            break;
          }

          const pack = creditPack(packId);
          if (!pack) {
            console.error(`[dodo-webhook] Credit purchase names an unknown pack: ${packId}. Cannot grant.`);
            break;
          }

          try {
            // Same two-layer idempotency as the plan grant: cheap early return so
            // a retry stops retrying, plus a `create()` of the same marker inside
            // the grant batch so two concurrent deliveries cannot both add credits.
            const processedRef = adminFirestore.collection('processed_webhooks').doc(webhookId);
            const alreadyProcessed = await processedRef.get();
            if (alreadyProcessed.exists) {
              console.log(`[dodo-webhook] Duplicate credit delivery ignored: ${webhookId}`);
              return NextResponse.json({ success: true, duplicate: true });
            }

            const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
            const businessDoc = await businessRef.get();
            if (!businessDoc.exists) {
              console.error(`Business record NOT FOUND in Firestore: ${businessId}`);
              break;
            }

            const bData = businessDoc.data() || {};
            const paidMajor = (pData.total_amount || 0) / 100;
            const currency = pData.currency || 'USD';
            const reference = pData.payment_id || 'dodo_' + Date.now();
            const previousBalance = Math.max(0, Number(bData.aiBonusCredits) || 0);

            const batch = adminFirestore.batch();

            // `increment`, never a computed total — a turn in flight is debiting
            // this same field and a read-then-write would refund it.
            batch.update(businessRef, {
              aiBonusCredits: FieldValue.increment(pack.credits),
              updatedAt: new Date(),
            });

            // `kind: 'credits'` is what keeps a one-off pack out of MRR. The admin
            // board derives the run rate from each business's *latest* purchase, so
            // an unmarked $8 pack would replace a $30 subscription and report the
            // shop as paying $8 a month. See `src/lib/platform-revenue.ts`.
            batch.set(adminFirestore.collection('purchases').doc(), {
              businessId: businessId,
              kind: 'credits',
              packId: pack.id,
              credits: pack.credits,
              // The revenue helpers key off `plan`; give them something readable
              // rather than `undefined` in a table cell.
              plan: `${pack.credits} AI credits`,
              amount: paidMajor,
              currency,
              timestamp: new Date(),
              reference,
              gateway: 'dodopayments',
            });

            batch.set(adminFirestore.collection(AI_CREDIT_LEDGER_COLLECTION).doc(), {
              businessId: businessId,
              businessName: bData.name || null,
              kind: 'purchase',
              source: 'dodo',
              credits: pack.credits,
              packId: pack.id,
              amount: paidMajor,
              currency,
              reference,
              // No uid: this request is authenticated by signature, not by a user.
              actorId: null,
              balanceBefore: previousBalance,
              balanceAfter: previousBalance + pack.credits,
              timestamp: new Date(),
            });

            batch.set(businessRef.collection('subscription_history').doc(), {
              action: `Bought ${pack.credits.toLocaleString()} Zen AI credits via Dodo`,
              amount: paidMajor,
              currency,
              timestamp: new Date(),
              dodo_payment_id: pData.payment_id,
            });

            batch.create(processedRef, {
              type: event.type,
              businessId: businessId,
              kind: 'credits',
              packId: pack.id,
              paymentId: pData.payment_id || null,
              processedAt: new Date(),
            });

            await batch.commit();
            console.log(`[dodo-webhook] Granted ${pack.credits} AI credits to business: ${businessId}`);

            notifyAdminsOfSubscription({
              businessName: bData.name || 'Another Business',
              planId: `${pack.credits.toLocaleString()} Zen AI credits`,
              amount: paidMajor,
              currency,
              kind: 'credits',
            }).catch(err => {
              console.error('[dodo-webhook] Failed to send admin credit-purchase notification:', err);
            });
          } catch (dbError: any) {
            console.error('Failed to grant AI credits in Dodo Webhook:', dbError.message);
            // 500 so Dodo retries. The early return above makes the retry cheap
            // once the grant has actually landed.
            throw dbError;
          }

          break;
        }

        if (businessId && planId) {
          try {
            /*
             * Idempotency. The expiry math below is additive — it extends from
             * the current expiry — so applying one `payment.succeeded` twice
             * grants twice the months. Nothing here deduped, and this is not a
             * hypothetical: the catch below rethrows to force Dodo's
             * retry-on-500, so a Firestore blip *after* a partial commit made
             * the platform re-grant on the retry. A replayed capture inside the
             * 300s tolerance window did the same deliberately.
             *
             * Two layers, because the cheap check alone races:
             *   1. Read the marker first and return 200 early — this is what
             *      makes a retry cheap and stops the retry loop.
             *   2. `batch.create()` the same marker inside the grant batch.
             *      create() fails if the document already exists, and it is in
             *      the same atomic commit as the plan update, so two concurrent
             *      deliveries cannot both grant. The loser throws, returns 500,
             *      and converges on the early return when Dodo retries.
             */
            const processedRef = adminFirestore.collection('processed_webhooks').doc(webhookId);
            const alreadyProcessed = await processedRef.get();
            if (alreadyProcessed.exists) {
              console.log(`[dodo-webhook] Duplicate delivery ignored: ${webhookId}`);
              return NextResponse.json({ success: true, duplicate: true });
            }

            const businessRef = adminFirestore.collection('businessInstances').doc(businessId);
            const businessDoc = await businessRef.get();

            if (businessDoc.exists) {
              const bData = businessDoc.data() || {};
              
              // Calculate proper expiration math identical to Paystack client integration
              let currentExpiry = new Date();
              if (bData.trialExpiresAt) {
                  const ts = bData.trialExpiresAt;
                  currentExpiry = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
              }
              
              const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
              const monthsToAdd = parseInt(cycleMonths) || 1;
              
              const newExpiryDate = new Date(startDate);
              newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

              const batch = adminFirestore.batch();
              
              // 1. Upgrade the business instance
              batch.update(businessRef, {
                  plan: planId,
                  trialExpiresAt: newExpiryDate,
                  accessLevel: null, // Revoke override access levels if explicitly paying
                  updatedAt: new Date()
              });
              
              // 2. Record core purchase audit record
              const purchasesRef = adminFirestore.collection('purchases').doc();
              batch.set(purchasesRef, {
                  businessId: businessId,
                  plan: planId,
                  amount: (pData.total_amount || 0) / 100, // Dodo yields total_amount in fractional units/cents
                  currency: pData.currency || 'USD',
                  timestamp: new Date(),
                  reference: pData.payment_id || 'dodo_' + Date.now(),
                  gateway: 'dodopayments'
              });

              // 3. Log sub-history entry within the business
              const historyRef = businessRef.collection('subscription_history').doc();
              batch.set(historyRef, {
                  action: `Subscribed via Dodo for ${monthsToAdd} month(s)`,
                  amount: (pData.total_amount || 0) / 100,
                  currency: pData.currency || 'USD',
                  timestamp: new Date(),
                  dodo_payment_id: pData.payment_id
              });

              // 4. Idempotency marker, committed atomically with the grant.
              // create() (not set()) so a concurrent delivery that already
              // wrote this id fails the entire batch instead of double-granting.
              batch.create(processedRef, {
                  type: event.type,
                  businessId: businessId,
                  planId: planId,
                  paymentId: pData.payment_id || null,
                  processedAt: new Date()
              });

              await batch.commit();
              console.log(`[dodo-webhook] Applied plan update to business: ${businessId}`);
              
              // Notify platform admins/owners about the new subscription
              notifyAdminsOfSubscription({
                businessName: bData.name || 'Another Business',
                planId: planId,
                amount: (pData.total_amount || 0) / 100,
                currency: pData.currency || 'USD'
              }).catch(err => {
                console.error('[dodo-webhook] Failed to send admin subscription notification:', err);
              });
            } else {
              console.error(`Business record NOT FOUND in Firestore: ${businessId}`);
            }
          } catch (dbError: any) {
            console.error("Failed to update Firestore in Dodo Webhook:", dbError.message);
            // We throw to signal 500 to Dodo, forcing exponential retry until Firestore recovers.
            throw dbError; 
          }
        } else {
          console.warn('Warning: Received payment.succeeded without valid metadata (businessId/planId). Skipping automation.');
        }
        break;
      }
        
      case 'subscription.cancelled':
        console.log('Subscription Cancelled:', event.data?.business_id);
        // TODO: Handle cancellation
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Dodo Webhook Processing Error:', err.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


