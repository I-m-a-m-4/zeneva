const DEFAULT_PROSPEO_KEY = 'pk_e67d67d65e775394c205acb644a2eacdd039a62b0ebb72b5310590a4ea678da2';

export interface ProspeoEnrichResult {
  email?: string;
  emailStatus?: 'VERIFIED' | 'ACCEPT_ALL' | 'EXTRACTED' | 'NOT_FOUND';
  fullName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  phone?: string;
  companyName?: string;
  error?: string;
}

/**
 * Executes a Prospeo API query to find and verify decision maker email addresses
 * for a domain or retail brand.
 */
export async function enrichLeadWithProspeo(params: {
  domain?: string;
  companyName?: string;
  contactName?: string;
}): Promise<ProspeoEnrichResult> {
  const apiKey = process.env.PROSPEO_API_KEY || DEFAULT_PROSPEO_KEY;
  if (!apiKey) {
    return { error: 'PROSPEO_API_KEY is not configured.' };
  }

  const { domain, companyName, contactName } = params;
  const cleanDomain = domain ? domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0].trim() : '';

  if (!cleanDomain && !companyName) {
    return { error: 'Domain or company name required for enrichment.' };
  }

  try {
    // 1. First attempt: Search for decision makers under the domain via /search-person
    if (cleanDomain) {
      try {
        const searchRes = await fetch('https://api.prospeo.io/search-person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KEY': apiKey,
          },
          body: JSON.stringify({
            page: 1,
            filters: {
              person_search: {
                company_domain: cleanDomain,
              },
            },
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const person = searchData.response?.results?.[0];
          if (person && person.person_id) {
            // Enrich this specific person
            const enrichRes = await fetch('https://api.prospeo.io/enrich-person', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-KEY': apiKey,
              },
              body: JSON.stringify({
                person_id: person.person_id,
              }),
            });

            if (enrichRes.ok) {
              const enrichData = await enrichRes.json();
              const pData = enrichData.response?.person;
              const emailObj = pData?.email;
              if (emailObj?.email) {
                return {
                  email: emailObj.email,
                  emailStatus: emailObj.status === 'VERIFIED' ? 'VERIFIED' : 'ACCEPT_ALL',
                  fullName: pData?.full_name || `${pData?.first_name || ''} ${pData?.last_name || ''}`.trim(),
                  jobTitle: pData?.job_title,
                  linkedinUrl: pData?.linkedin_url,
                  phone: pData?.phone_numbers?.[0],
                };
              }
            }
          }
        }
      } catch (_) {}
    }

    // 2. Second attempt: Direct person enrichment by domain / company name
    const directPayload: any = {
      only_verified_email: false,
    };

    if (cleanDomain) {
      directPayload.company_website = cleanDomain;
    }
    if (companyName && !cleanDomain) {
      directPayload.company_name = companyName;
    }
    if (contactName) {
      directPayload.full_name = contactName;
    }

    const directRes = await fetch('https://api.prospeo.io/enrich-person', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-KEY': apiKey,
      },
      body: JSON.stringify(directPayload),
    });

    if (directRes.ok) {
      const data = await directRes.json();
      const person = data.response?.person;
      const email = person?.email?.email;
      if (email) {
        return {
          email,
          emailStatus: person.email.status === 'VERIFIED' ? 'VERIFIED' : 'ACCEPT_ALL',
          fullName: person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          jobTitle: person.job_title,
          linkedinUrl: person.linkedin_url,
          phone: person.phone_numbers?.[0],
        };
      }
    }

    // 3. Third attempt: Company enrichment via /enrich-company
    if (cleanDomain) {
      const compRes = await fetch('https://api.prospeo.io/enrich-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KEY': apiKey,
        },
        body: JSON.stringify({
          company_website: cleanDomain,
        }),
      });

      if (compRes.ok) {
        const compData = await compRes.json();
        const company = compData.response?.company;
        const generalEmail = company?.email || company?.contact_email;
        if (generalEmail) {
          return {
            email: generalEmail,
            emailStatus: 'EXTRACTED',
            companyName: company.name,
            phone: company.phone,
          };
        }
      }
    }

    return {
      emailStatus: 'NOT_FOUND',
    };
  } catch (err: any) {
    console.error('[Prospeo API Error]:', err);
    return {
      error: err?.message || 'Prospeo enrichment request failed',
      emailStatus: 'NOT_FOUND',
    };
  }
}
