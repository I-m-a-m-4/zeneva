
export default function TermsOfServicePage() {
  return (
    <>
      <h1>Terms of Service for Zeneva</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the Zeneva software-as-a-service platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users of the Service, including administrators, managers, and operators ("Users").
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Zeneva provides a comprehensive business management platform that includes inventory management, a Point of Sale (POS) system, customer relationship management (CRM), sales analytics, and an optional public-facing e-commerce storefront.
      </p>

      <h2>3. User Accounts</h2>
      <p>
        To use the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account. You agree to:
      </p>
      <ul>
        <li>Provide true, accurate, current, and complete information about yourself as prompted by the registration form.</li>
        <li>Promptly update your registration data to keep it true, accurate, current, and complete.</li>
        <li>Immediately notify us of any unauthorized use of your password or account or any other breach of security.</li>
      </ul>

      <h2>4. Subscriptions and Billing</h2>
      <p>
        The Service is offered under various subscription plans.
      </p>
      <ul>
        <li><strong>Free Trial:</strong> New businesses are eligible for a 30-day free trial. At the end of the trial period, you must subscribe to a paid plan to continue using features beyond the 'Starter' tier.</li>
        <li><strong>Billing:</strong> Fees for paid plans are billed on a subscription basis (e.g., monthly, annually). You will be billed in advance on a recurring, periodic basis.</li>
        <li><strong>Payment:</strong> We use a third-party payment processor (Paystack) to handle payments. By subscribing, you agree to their terms and conditions.</li>
        <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your account's billing page. The cancellation will take effect at the end of the current billing cycle.</li>
      </ul>
      
      <h2>5. User Conduct and Responsibilities</h2>
      <p>
        You are solely responsible for all data, information, and content that you upload, post, or otherwise transmit via the Service ("Your Content"). You agree not to use the Service to:
      </p>
      <ul>
        <li>Upload or transmit any content that is unlawful, harmful, or infringes on the rights of others.</li>
        <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
        <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
      </ul>
      <p>
        You retain all ownership rights to Your Content. We do not claim any ownership rights over Your Content.
      </p>
      
      <h2>6. Intellectual Property</h2>
      <p>
        The Service and its original content (excluding Your Content), features, and functionality are and will remain the exclusive property of Zeneva and its licensors. The Service is protected by copyright, trademark, and other laws of both Nigeria and foreign countries.
      </p>
      
      <h2>7. Termination</h2>
      <p>
        We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. If you wish to terminate your account, you may do so from the "Danger Zone" section in your settings page.
      </p>
      
      <h2>8. Disclaimer of Warranties</h2>
      <p>
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Your use of the Service is at your sole risk. We expressly disclaim all warranties of any kind, whether express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
      </p>
      
      <h2>9. Limitation of Liability</h2>
      <p>
        In no event shall Zeneva, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
      </p>
      
      <h2>10. Governing Law</h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions.
      </p>
      
      <h2>11. Changes to Terms</h2>
      <p>
        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at: <strong>zenevapos@gmail.com</strong>.
      </p>
    </>
  );
}
