export interface ZeroBounceValidationResponse {
  address: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string | null;
  account?: string;
  domain?: string;
  domain_age_days?: string;
  smtp_provider?: string;
  mx_found?: string;
  mx_record?: string;
  firstname?: string;
  lastname?: string;
  gender?: string;
  city?: string;
  region?: string;
  zipcode?: string;
  country?: string;
  processed_at?: string;
  error?: string;
}

export interface EmailVerificationResult {
  canSend: boolean;
  status: string;
  subStatus?: string;
  reason?: string;
  suggestedCorrection?: string;
}

/**
 * Validates an email using the ZeroBounce API to protect Resend / Gmail domain reputation.
 * Prevents hard bounces, spam traps, abuse inboxes, and disposable domains.
 */
export async function validateEmailWithZeroBounce(email: string): Promise<EmailVerificationResult> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Basic sanity check
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(cleanEmail)) {
    return {
      canSend: false,
      status: 'invalid_syntax',
      reason: 'The email address format is invalid.',
    };
  }

  const apiKey = process.env.ZEROBOUNCE_API_KEY || 'e3ce8d63b7eb470fada1a4085bb4ab99';
  if (!apiKey) {
    // If no key configured, pass syntax check to avoid blocking
    return {
      canSend: true,
      status: 'unverified_bypass',
      reason: 'ZeroBounce API key not configured; passed syntax validation only.',
    };
  }

  try {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(cleanEmail)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }, // Cache lookup for 24h
    });

    if (!res.ok) {
      console.warn(`[ZeroBounce API Warning] HTTP ${res.status}: ${await res.text()}`);
      // Fallback: don't permanently fail if ZeroBounce experiences rate limits or server dips
      return {
        canSend: true,
        status: 'api_unavailable',
        reason: 'ZeroBounce returned non-200. Passed fallback check.',
      };
    }

    const data: ZeroBounceValidationResponse = await res.json();

    if (data.error) {
      console.warn('[ZeroBounce Error]', data.error);
      return {
        canSend: true,
        status: 'error_bypass',
        reason: data.error,
      };
    }

    // Determine deliverability:
    // 'valid' and 'catch-all' are acceptable for cold business B2B outreach.
    // 'invalid', 'spamtrap', 'abuse', 'do_not_mail' MUST be rejected to protect sender score.
    const isDeliverable = data.status === 'valid' || data.status === 'catch-all';

    return {
      canSend: isDeliverable,
      status: data.status,
      subStatus: data.sub_status,
      reason: isDeliverable
        ? `Deliverable email verified by ZeroBounce (${data.status}).`
        : `High bounce risk (${data.status}: ${data.sub_status || 'unreachable'}). Blocked to protect sender reputation.`,
      suggestedCorrection: data.did_you_mean || undefined,
    };
  } catch (err: any) {
    console.error('[ZeroBounce Exception]', err);
    return {
      canSend: true,
      status: 'network_fallback',
      reason: 'Network error validating with ZeroBounce; allowed by fallback.',
    };
  }
}
