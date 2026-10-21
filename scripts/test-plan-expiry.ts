import {
  isPaidPlan,
  isPaidPlanExpired,
  getTrialDaysRemaining,
  isTrialExpired,
  isCoreFeatureBlocked,
  isAccountReadOnly,
  effectivePlan
} from '../src/lib/plan';

let passed = 0;
let failed = 0;

function assert(desc: string, actual: any, expected: any) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${desc} -> Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

console.log('Testing plan and trial expiration logic...');

// 1. isPaidPlan
assert('starter is not paid', isPaidPlan({ plan: 'starter' }), false);
assert('null is not paid', isPaidPlan(null), false);
assert('pro is paid', isPaidPlan({ plan: 'pro' }), true);
assert('business is paid', isPaidPlan({ plan: 'business' }), true);

// 2. isPaidPlanExpired
assert('lifetime is never expired', isPaidPlanExpired({ plan: 'pro', accessLevel: 'lifetime' }), false);
assert('starter is not considered paid-expired', isPaidPlanExpired({ plan: 'starter' }), false);
assert('pro with future expiry is not expired', isPaidPlanExpired({ plan: 'pro', trialExpiresAt: new Date(now + 10 * oneDayMs) }), false);
assert('pro with past expiry is expired', isPaidPlanExpired({ plan: 'pro', trialExpiresAt: new Date(now - 2 * oneDayMs) }), true);
assert('pro with missing expiry is expired', isPaidPlanExpired({ plan: 'pro', trialExpiresAt: null }), true);

// 3. getTrialDaysRemaining
assert('lifetime trial days is 0', getTrialDaysRemaining({ accessLevel: 'lifetime' }), 0);
assert('pro trial days is 0', getTrialDaysRemaining({ plan: 'pro' }), 0);
assert('fresh starter trial days is 30', getTrialDaysRemaining({ plan: 'starter', createdAt: new Date(now) }), 30);
assert('starter created 10 days ago has 20 days', getTrialDaysRemaining({ plan: 'starter', createdAt: new Date(now - 10 * oneDayMs) }), 20);
assert('starter created 35 days ago has 0 days', getTrialDaysRemaining({ plan: 'starter', createdAt: new Date(now - 35 * oneDayMs) }), 0);
assert('starter with explicit future trialExpiresAt', getTrialDaysRemaining({ plan: 'starter', trialExpiresAt: new Date(now + 5 * oneDayMs) }), 5);
assert('starter with explicit past trialExpiresAt', getTrialDaysRemaining({ plan: 'starter', trialExpiresAt: new Date(now - 2 * oneDayMs) }), 0);

// 4. isTrialExpired
assert('lifetime trial is not expired', isTrialExpired({ accessLevel: 'lifetime' }), false);
assert('pro trial is not expired', isTrialExpired({ plan: 'pro' }), false);
assert('fresh starter trial is not expired', isTrialExpired({ plan: 'starter', createdAt: new Date(now) }), false);
assert('starter at 25 days is not expired', isTrialExpired({ plan: 'starter', createdAt: new Date(now - 25 * oneDayMs) }), false);
assert('starter at 32 days is expired', isTrialExpired({ plan: 'starter', createdAt: new Date(now - 32 * oneDayMs) }), true);
assert('starter with future trialExpiresAt is not expired', isTrialExpired({ plan: 'starter', trialExpiresAt: new Date(now + 3 * oneDayMs) }), false);
assert('starter with past trialExpiresAt is expired', isTrialExpired({ plan: 'starter', trialExpiresAt: new Date(now - 1 * oneDayMs) }), true);

// 5. isCoreFeatureBlocked (Read-Only Mode)
assert('lifetime is never blocked', isCoreFeatureBlocked({ accessLevel: 'lifetime' }), false);
assert('deleted business is blocked', isCoreFeatureBlocked({ status: 'deleted' }), true);
assert('blocked business is blocked', isCoreFeatureBlocked({ status: 'blocked' }), true);
assert('active pro subscriber is NOT blocked', isCoreFeatureBlocked({ plan: 'pro', trialExpiresAt: new Date(now + 15 * oneDayMs) }), false);
assert('active business subscriber is NOT blocked', isCoreFeatureBlocked({ plan: 'business', trialExpiresAt: new Date(now + 30 * oneDayMs) }), false);
assert('starter within 30 days is NOT blocked', isCoreFeatureBlocked({ plan: 'starter', createdAt: new Date(now - 14 * oneDayMs) }), false);
assert('starter past 30 days IS BLOCKED (Read-Only)', isCoreFeatureBlocked({ plan: 'starter', createdAt: new Date(now - 35 * oneDayMs) }), true);
assert('starter with past trialExpiresAt IS BLOCKED (Read-Only)', isCoreFeatureBlocked({ plan: 'starter', trialExpiresAt: new Date(now - 1 * oneDayMs) }), true);
assert('expired pro subscriber IS BLOCKED (Read-Only)', isCoreFeatureBlocked({ plan: 'pro', trialExpiresAt: new Date(now - 5 * oneDayMs) }), true);
assert('expired business subscriber IS BLOCKED (Read-Only)', isCoreFeatureBlocked({ plan: 'business', trialExpiresAt: new Date(now - 5 * oneDayMs) }), true);
assert('isAccountReadOnly is identical to isCoreFeatureBlocked', isAccountReadOnly({ plan: 'starter', createdAt: new Date(now - 40 * oneDayMs) }), true);

// 6. effectivePlan
assert('active pro is pro', effectivePlan({ plan: 'pro', trialExpiresAt: new Date(now + 5 * oneDayMs) }), 'pro');
assert('lapsed pro falls back to starter', effectivePlan({ plan: 'pro', trialExpiresAt: new Date(now - 5 * oneDayMs) }), 'starter');
assert('active business is business', effectivePlan({ plan: 'business', trialExpiresAt: new Date(now + 5 * oneDayMs) }), 'business');
assert('lifetime is business', effectivePlan({ accessLevel: 'lifetime' }), 'business');
assert('starter is starter', effectivePlan({ plan: 'starter' }), 'starter');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
