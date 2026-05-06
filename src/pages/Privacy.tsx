import { LegalLayout } from "@/components/humanise/LegalLayout";

const Privacy = () => (
  <LegalLayout title="Privacy Policy" updated="Last updated May 2026">
    <h2>Overview</h2>
    <p>
      Humanise is a free AI automation risk calculator for New Zealand workers, operated by Hillary
      Woods as a sole trader. This policy explains what information we collect when you use
      humanise.nz, why we collect it, and your rights under the New Zealand Privacy Act 2020.
    </p>
    <p>
      If you have questions about this policy or how your data is handled, contact Hillary directly
      at <a href="mailto:hillary@humanise.nz">hillary@humanise.nz</a>.
    </p>

    <h2>Who we are</h2>
    <p>Humanise is operated by Hillary Woods, sole trader, based in New Zealand.</p>
    <p>Contact: hillary@humanise.nz<br />Website: humanise.nz</p>

    <h2>What we collect</h2>
    <p>
      We collect the minimum information needed to give you a useful AI risk score and improve the
      service over time.
    </p>

    <h3>When you take the quiz</h3>
    <ul>
      <li><strong>Job title</strong> — the role you enter in question 1</li>
      <li><strong>Industry</strong> — the industry you select in question 2</li>
      <li><strong>Computer-based work intensity</strong> — your answer to question 3</li>
      <li><strong>AI tool usage</strong> — your answer to question 4</li>
      <li><strong>Location</strong> — your NZ region from question 5</li>
      <li><strong>Calculated risk score and band</strong> — the score Humanise generates from your answers</li>
    </ul>
    <p>
      Quiz responses are stored anonymously by default. We do not link them to a name or identity
      unless you provide an email address.
    </p>

    <h3>When you provide an email</h3>
    <ul>
      <li><strong>Email address</strong> — if you submit one to receive your upskill pack, join the waitlist, or sign up for updates</li>
      <li><strong>The quiz response linked to your email</strong> — so we can send you content relevant to your role</li>
    </ul>
    <p>We never sell, rent, or share your email address with third parties for marketing purposes.</p>

    <h3>When you visit the site</h3>
    <p>
      Like most websites, we use Google Analytics 4 to understand how the site is used in
      aggregate. This may collect:
    </p>
    <ul>
      <li>Pages visited and time spent on each page</li>
      <li>How you arrived at the site (referral source)</li>
      <li>Approximate location (city/region level, derived from IP address)</li>
      <li>Device and browser type</li>
      <li>Anonymous user identifiers via cookies</li>
    </ul>
    <p>
      This data is aggregated and used only to improve the product. We do not use it to identify
      individual users.
    </p>

    <h2>Why we collect it</h2>
    <ul>
      <li><strong>To calculate your risk score</strong> — your quiz answers feed the scoring model</li>
      <li><strong>To send you the upskill pack or roadmap updates</strong> — if you provide an email</li>
      <li><strong>To understand how Humanise is used</strong> — aggregated analytics help us improve the product</li>
      <li><strong>To improve the scoring model over time</strong> — anonymous patterns across many quiz responses help refine accuracy</li>
    </ul>

    <h2>Who we share it with</h2>
    <p>
      We use trusted third-party services to operate Humanise. These services process data only to
      deliver their specific function and are bound by their own privacy policies and contractual
      obligations.
    </p>
    <p>The categories of providers we use include:</p>
    <ul>
      <li><strong>Hosting and database providers</strong> — to store quiz responses and email addresses</li>
      <li><strong>Email delivery services</strong> — to send confirmation and content emails</li>
      <li><strong>Analytics services</strong> — to understand how the site is used in aggregate</li>
      <li><strong>AI services</strong> — to generate the personalised "Honest Picture" paragraph based on your quiz answers</li>
    </ul>
    <p>We do not sell or share your data for advertising or marketing by third parties.</p>

    <h2>Your rights under the NZ Privacy Act 2020</h2>
    <p>As a New Zealand resident using Humanise, you have the right to:</p>
    <ul>
      <li><strong>Access your data</strong> — request a copy of any personal information we hold about you</li>
      <li><strong>Correct your data</strong> — ask us to fix any inaccurate information</li>
      <li><strong>Delete your data</strong> — ask us to remove your email and quiz response from our database</li>
      <li><strong>Withdraw consent</strong> — unsubscribe from emails or stop using the service at any time</li>
    </ul>
    <p>
      To exercise any of these rights, email <a href="mailto:hillary@humanise.nz">hillary@humanise.nz</a> with the subject line "Privacy request". We
      will respond within 20 working days as required by the Privacy Act.
    </p>

    <h2>How long we keep your data</h2>
    <ul>
      <li><strong>Quiz responses</strong> — kept indefinitely in anonymised form to improve the scoring model. If you provide an email, we keep the linked quiz response until you ask us to delete it.</li>
      <li><strong>Email addresses</strong> — kept until you unsubscribe or request deletion</li>
      <li><strong>Analytics data</strong> — Google Analytics retains data for 14 months by default</li>
    </ul>

    <h2>Cookies</h2>
    <p>
      Humanise uses cookies set by Google Analytics to count unique visitors and understand how the
      site is used. These cookies do not identify you personally.
    </p>
    <p>
      You can disable cookies in your browser settings or use a browser extension to opt out of
      Google Analytics. Doing so will not affect your ability to use the quiz.
    </p>

    <h2>Children</h2>
    <p>
      Humanise is not intended for users under 16. We do not knowingly collect data from children.
      If you believe a child has provided us with information, contact hillary@humanise.nz and we
      will delete it.
    </p>

    <h2>Changes to this policy</h2>
    <p>
      If we update this policy, we will update the date at the top of this page. Significant
      changes will be communicated to anyone on the email list.
    </p>

    <h2>How to make a complaint</h2>
    <p>
      If you have a concern about how your data is handled, please contact hillary@humanise.nz
      first so we can address it directly.
    </p>
    <p>
      If you are not satisfied with our response, you have the right to make a complaint to the
      Office of the Privacy Commissioner of New Zealand:
    </p>
    <ul>
      <li>Website: <a href="https://privacy.org.nz" target="_blank" rel="noreferrer">privacy.org.nz</a></li>
      <li>Phone: 0800 803 909</li>
      <li>Email: <a href="mailto:enquiries@privacy.org.nz">enquiries@privacy.org.nz</a></li>
    </ul>
  </LegalLayout>
);

export default Privacy;
