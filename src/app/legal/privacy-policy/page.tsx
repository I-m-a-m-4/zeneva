
export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy for Zeneva</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <h2>Introduction</h2>
      <p>
        Welcome to Zeneva ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our software-as-a-service platform (the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the service.
      </p>
      
      <h2>1. Information We Collect</h2>
      <p>
        We may collect information about you in a variety of ways. The information we may collect via the Service includes:
      </p>
      
      <h3>A. Personal Data</h3>
      <p>
        Personally identifiable information, such as your <strong>name, email address, and telephone number</strong>, that you voluntarily give to us when you register with the Service or when you choose to participate in various activities related to the Service.
      </p>
      
      <h3>B. Business Data</h3>
      <p>
        Information related to your business that you provide or generate, including but not limited to:
      </p>
      <ul>
        <li>Product details (names, SKUs, prices, stock levels, images)</li>
        <li>Sales transaction records (receipts, items sold, totals)</li>
        <li>Customer information (names, emails, phone numbers, purchase history)</li>
        <li>Business settings and configurations</li>
      </ul>
      <p>
        <strong>This Business Data is considered your confidential property. We will not use it for any purpose other than providing and improving the Service.</strong>
      </p>
      
      <h3>C. Derivative Data</h3>
      <p>
        Information our servers automatically collect when you access the Service, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Service.
      </p>
      
      <h2>2. How We Use Your Information</h2>
      <p>
        Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:
      </p>
      <ul>
        <li>Create and manage your account.</li>
        <li>Process your transactions and subscriptions.</li>
        <li>Provide you with the core functionality of inventory management, POS, and CRM.</li>
        <li>Email you regarding your account or order.</li>
        <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
        <li>Notify you of updates to the Service.</li>
        <li>Provide customer support and respond to your requests.</li>
      </ul>
      
      <h2>3. Disclosure of Your Information</h2>
      <p>
        We do not share, sell, rent, or trade your Personal Data or Business Data with third parties for their commercial purposes. We may share information we have collected about you in certain situations:
      </p>
      <ul>
        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
        <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us, including local and international payment processing (Paystack), data analysis, email delivery (EmailJS), and hosting services.</li>
        <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
      </ul>
      
      <h2>4. Data Security & Encryption</h2>
      <p>
        We use administrative, technical, and physical security measures to protect your personal information and Business Data. This includes:
      </p>
      <ul>
        <li><strong>Encryption at Rest:</strong> Sensitive business and transaction data is protected using AES-256 bank-grade encryption to ensure information remains confidential even when stored locally.</li>
        <li><strong>Secure Transmission:</strong> All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols.</li>
        <li><strong>Multi-Tenant Isolation:</strong> We use strict logical boundaries to ensure your data is accessible only by you and your authorized staff.</li>
      </ul>
      
      <h2>5. Your Rights</h2>
      <p>
        You have the right to:
      </p>
      <ul>
        <li>Review or change the information in your account by logging into your account settings and updating your account.</li>
        <li>Terminate your account, which will result in the deletion of your Personal Data and the archiving or deletion of your Business Data according to our data retention policies.</li>
      </ul>
      
      <h2>6. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
      </p>
      
      <h2>7. Contact Us</h2>
      <p>
        If you have questions or comments about this Privacy Policy, please contact us at: <strong>zenevapos@gmail.com</strong>.
      </p>
    </>
  );
}
