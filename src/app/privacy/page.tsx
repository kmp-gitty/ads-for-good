import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ads for Good",
  description:
    "How ads for Good collects, uses, shares, and protects information across our website, our marketing services, and the Chapter platform.",
};

const EFFECTIVE = "July 2026";

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl font-extrabold text-neutral-900">
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-neutral-700">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Effective date: <span className="font-semibold">{EFFECTIVE}</span> ·{" "}
          <Link href="/terms-disclaimer" className="font-semibold text-orange-600 hover:text-orange-700">
            Terms of Service
          </Link>
        </p>

        <section className="mt-8 space-y-3">
          <P>
            This Privacy Policy explains how ads for Good (&ldquo;afG&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
            collects, uses, shares, and protects information across our website, our marketing services, and the Chapter
            platform (including Smart Prompts, Smart Links, and our measurement and analytics technology). We aim to be
            privacy-forward: we hash identifiers wherever we can, keep raw personal data for as short a time as possible,
            and <span className="font-semibold">we do not sell personal information</span>.
          </P>
        </section>

        {/* Roles */}
        <section className="mt-10 space-y-3">
          <H2 id="roles">Our two roles</H2>
          <UL>
            <li>
              <span className="font-semibold">Controller</span> &mdash; for our own website and business (e.g. visitors
              to ads4good.com, people who contact us, and account holders), we decide how and why data is used.
            </li>
            <li>
              <span className="font-semibold">Processor</span> &mdash; for data we handle on a client&rsquo;s behalf
              (event data from their properties, and contacts captured through their prompts), the client is the
              controller and we process it on their instructions, as described in our Terms and any signed agreement.
            </li>
          </UL>
        </section>

        {/* What we collect */}
        <section className="mt-10 space-y-3">
          <H2 id="collect">Information we collect</H2>
          <div className="space-y-3">
            <P>
              <span className="font-semibold">Website usage &amp; device data.</span> Pages viewed, clicks, time on
              page, scroll depth, referrer, approximate location (city/region/country), and browser/device information &mdash;
              used for analytics and to improve the site.
            </P>
            <P>
              <span className="font-semibold">Contact information you provide.</span> If you submit a form, sign up, or
              contact us: your name, email, phone, company, and anything you include in your message.
            </P>
            <P>
              <span className="font-semibold">Account &amp; billing data.</span> For self-serve accounts: your name,
              email, phone, business name, and subscription status. Payments are processed by Stripe; we don&rsquo;t
              store full card numbers &mdash; Stripe does, as our payment processor.
            </P>
            <P>
              <span className="font-semibold">Chapter event data (on clients&rsquo; sites).</span> When Chapter is
              installed on a client&rsquo;s properties, it processes page interactions, event and campaign identifiers,
              referral/attribution information, and anonymized or hashed user identifiers &mdash; on that client&rsquo;s
              behalf.
            </P>
            <P>
              <span className="font-semibold">Contacts captured for a client (&ldquo;Leads&rdquo;).</span> When a
              visitor submits their email or phone through a client&rsquo;s prompt, we process that contact (and any
              consent choice) on the client&rsquo;s instructions. We hold it only short-term, deliver it to the client,
              and then delete it from Chapter (see Retention).
            </P>
            <P>
              <span className="font-semibold">Cookies &amp; similar technologies.</span> We and our clients&rsquo; sites
              use first-party cookies/identifiers to measure usage and stitch a visitor&rsquo;s journey. Consent is
              honored where required; see Cookies below.
            </P>
          </div>
        </section>

        {/* How we use */}
        <section className="mt-10 space-y-3">
          <H2 id="use">How we use information</H2>
          <UL>
            <li>provide, operate, secure, and improve our website, services, and the Chapter platform;</li>
            <li>perform analytics and attribution, and generate <span className="font-semibold">aggregated, anonymized</span> benchmarks that don&rsquo;t identify any person or client;</li>
            <li>process subscriptions, billing, and support;</li>
            <li>communicate with you about your account, service updates, and (where permitted) relevant offers; and</li>
            <li>comply with legal obligations and enforce our Terms.</li>
          </UL>
          <P>We do not use a client&rsquo;s data to train models or inform work for other clients without that client&rsquo;s prior written consent.</P>
        </section>

        {/* Hashing */}
        <section className="mt-10 space-y-3">
          <H2 id="hashing">Our privacy-forward approach to identifiers</H2>
          <P>
            Wherever possible we convert emails and phone numbers into a one-way <span className="font-semibold">SHA-256 hash</span>{" "}
            for identity resolution and attribution. A hash can&rsquo;t be reversed back into the original email or phone.
            When a client uses a prompt to collect contacts they want to keep, we process the raw value only to deliver
            it to that client and then delete it &mdash; we don&rsquo;t retain a long-term raw copy.
          </P>
        </section>

        {/* Cookies */}
        <section className="mt-10 space-y-3">
          <H2 id="cookies">Cookies &amp; tracking</H2>
          <P>
            Our pixel uses first-party cookies/identifiers to recognize a browser across a visit and to measure how the
            site is used. Where consent is required, tracking respects the visitor&rsquo;s consent choice, and a
            visitor&rsquo;s opt-out prevents new identifiers and non-essential collection. You can also control cookies
            through your browser settings.
          </P>
        </section>

        {/* Sharing */}
        <section className="mt-10 space-y-3">
          <H2 id="sharing">How we share information</H2>
          <P>We do not sell personal information. We share it only:</P>
          <UL>
            <li>
              <span className="font-semibold">with service providers (subprocessors)</span> who help us run the platform
              &mdash; for example cloud hosting and database (Supabase), application hosting (Vercel), payments (Stripe),
              and transactional email (Resend) &mdash; each under confidentiality and data-protection obligations, and
              only as needed to provide the service;
            </li>
            <li><span className="font-semibold">with a client</span>, for the contacts and data we process on their behalf;</li>
            <li><span className="font-semibold">when required by law</span>, or to protect rights, safety, and the integrity of our systems; and</li>
            <li><span className="font-semibold">in a business transfer</span> (e.g. merger or acquisition), subject to this Policy.</li>
          </UL>
        </section>

        {/* Retention */}
        <section className="mt-10 space-y-3">
          <H2 id="retention">Data retention</H2>
          <UL>
            <li><span className="font-semibold">Captured leads (raw email/phone):</span> held short-term, delivered to the client on a recurring basis, then deleted from Chapter.</li>
            <li><span className="font-semibold">Event &amp; analytics data:</span> retained to provide measurement and attribution, and may be retained in hashed/anonymized form; aggregated benchmark data (which identifies no one) may be retained indefinitely.</li>
            <li><span className="font-semibold">Account &amp; billing records:</span> retained while your account is active and as required for legal, tax, and accounting purposes.</li>
            <li>On termination or a verified request, we return or delete personal data except where retention is required by law.</li>
          </UL>
        </section>

        {/* Security */}
        <section className="mt-10 space-y-3">
          <H2 id="security">Security</H2>
          <P>
            We maintain reasonable administrative, technical, and organizational safeguards designed to protect data
            against unauthorized access, disclosure, alteration, or destruction &mdash; including access controls,
            tenant-level isolation, encryption in transit and at rest through our providers, and limiting access to
            authorized personnel. No method of transmission or storage is 100% secure, but we work to protect your
            information and will notify affected parties and cooperate as required if a data breach occurs.
          </P>
        </section>

        {/* Rights */}
        <section className="mt-10 space-y-3">
          <H2 id="rights">Your privacy rights</H2>
          <P>
            Depending on where you live (e.g. under GDPR/UK GDPR or CCPA/CPRA), you may have the right to access,
            correct, delete, or receive a copy of your personal information, to object to or restrict certain processing,
            and to opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information (we don&rsquo;t
            sell). We will not discriminate against you for exercising these rights.
          </P>
          <P>
            To exercise a right, email{" "}
            <a href="mailto:katoa@ads4good.com" className="font-semibold text-orange-600 hover:text-orange-700">
              katoa@ads4good.com
            </a>
            . If your request concerns data we process on a client&rsquo;s behalf, we&rsquo;ll refer you to, or work
            with, that client (the controller). We may need to verify your identity before acting.
          </P>
        </section>

        {/* Transfers + children */}
        <section className="mt-10 space-y-3">
          <H2 id="other">International transfers &amp; children</H2>
          <P>
            We operate in the United States; if you access our services from elsewhere, your information may be processed
            in the U.S. and other countries with different data-protection laws, and we rely on appropriate safeguards
            where required. Our services are not directed to children under 16, and we do not knowingly collect their
            personal information.
          </P>
        </section>

        {/* Changes + contact */}
        <section className="mt-10 space-y-3">
          <H2 id="changes">Changes &amp; contact</H2>
          <P>
            We may update this Policy from time to time; material changes take effect on the date posted. Questions or
            requests? Email{" "}
            <a href="mailto:katoa@ads4good.com" className="font-semibold text-orange-600 hover:text-orange-700">
              katoa@ads4good.com
            </a>
            .
          </P>
        </section>

        <p className="mt-12 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
          Provided for transparency; not legal advice. See our{" "}
          <Link href="/terms-disclaimer" className="font-semibold text-neutral-600 hover:text-neutral-800">Terms of Service</Link>{" "}
          for the agreement governing use of our website, services, and the Chapter platform.
        </p>
      </div>
    </main>
  );
}
