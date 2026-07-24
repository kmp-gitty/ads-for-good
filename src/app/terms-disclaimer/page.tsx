import Link from "next/link";

export const metadata = {
  title: "Terms of Service | ads for Good",
  description:
    "The terms governing use of the ads for Good website, our marketing services, and the Chapter platform (Smart Prompts, Smart Links, and analytics).",
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

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Effective date: <span className="font-semibold">{EFFECTIVE}</span> ·{" "}
          <Link href="/privacy" className="font-semibold text-orange-600 hover:text-orange-700">
            Privacy Policy
          </Link>
        </p>

        <section className="mt-8 space-y-3">
          <P>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the ads for Good
            (&ldquo;afG&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) website, our marketing and advisory services, and
            the Chapter platform &mdash; including the self-serve tools <span className="font-semibold">Smart Prompts</span>{" "}
            and <span className="font-semibold">Smart Links</span> and our measurement and analytics technology
            (collectively, &ldquo;Chapter&rdquo;). By using our website, creating an account, subscribing to a plan, or
            using our services, you (&ldquo;you&rdquo; or &ldquo;Client&rdquo;) agree to these Terms.
          </P>
          <P>
            <span className="font-semibold">Signed agreements control.</span> If you have signed a Services Agreement,
            Statement of Work (&ldquo;SOW&rdquo;), or other written agreement with us, that agreement governs the
            services it describes and prevails over any conflicting provision here. These Terms govern your use of our
            website and our self-serve products, and otherwise supplement &mdash; but do not replace &mdash; any signed
            agreement.
          </P>
        </section>

        {/* 1 — Ways to work with us */}
        <section className="mt-10 space-y-3">
          <H2 id="services">1. The ways you can work with us</H2>
          <P>We offer two things, and these Terms cover both:</P>
          <UL>
            <li>
              <span className="font-semibold">Marketing services (agency).</span> Ongoing, subscription-based marketing,
              business, and advisory support, delivered under a Statement of Work.
            </li>
            <li>
              <span className="font-semibold">Self-serve software (SaaS).</span> Chapter tools you configure and run
              yourself &mdash; Smart Prompts and Smart Links &mdash; on a monthly subscription.
            </li>
          </UL>
          <P>You may use one or both. Where a section applies only to one, we say so.</P>
        </section>

        {/* 2 — Marketing services */}
        <section className="mt-10 space-y-3">
          <H2 id="agency">2. Marketing services (agency engagements)</H2>
          <P>
            Marketing services are provided under a subscription model based on the number of active marketing projects,
            as set out in your SOW. The SOW is the controlling document for these services; the summary below is for
            convenience.
          </P>
          <P>
            <span className="font-semibold">Plans.</span> Support, Partner, and Team plans differ by the number of active
            marketing projects, prioritization, delivery cadence, and included meetings. A &ldquo;marketing project&rdquo;
            is a defined unit of work within a marketing function (e.g. SEO, paid-advertising support, website updates,
            email marketing, analytics), progressing through strategy, planning, setup, execution, and reporting.
            Projects are flexible (you may swap, pause, or change them), sequentially progressed by milestone, and
            capacity-limited to your plan.
          </P>
          <P>
            <span className="font-semibold">What&rsquo;s not included.</span> Unless agreed in writing: work beyond your
            plan&rsquo;s active-project capacity; expedited requests beyond your plan&rsquo;s prioritization; large
            one-time deliverables needing dedicated scoping; media spend and third-party platform costs; legal,
            accounting, or tax advice; and any guaranteed results.
          </P>
          <P>
            <span className="font-semibold">Your responsibilities.</span> You agree to provide timely access to
            necessary data, accounts, materials, and stakeholders; ensure the accuracy and legality of information you
            provide; designate a primary point of contact; and give feedback and approvals promptly. Delays caused by
            missing information or approvals may affect timelines without penalty to afG.
          </P>
        </section>

        {/* 3 — Self-serve SaaS */}
        <section className="mt-10 space-y-3">
          <H2 id="saas">3. Self-serve software (Smart Prompts &amp; Smart Links)</H2>
          <P>
            <span className="font-semibold">Accounts.</span> You must provide accurate information, keep your login
            secure, and are responsible for activity under your account. You must be at least 18 and able to form a
            binding contract. One workspace represents one business; you&rsquo;re responsible for everyone you invite.
          </P>
          <P>
            <span className="font-semibold">Free trial.</span> New workspaces include a 21-day free trial of the
            included tools, with no card required. When the trial ends, access to a tool continues only if you have an
            active paid subscription to it; otherwise that tool is turned off (your saved configuration and data are
            retained per Section&nbsp;14 and the Privacy Policy, and access resumes if you subscribe).
          </P>
          <P>
            <span className="font-semibold">Subscriptions &amp; billing.</span> Paid plans are billed monthly in advance
            through our payment processor (Stripe). Each tool is a separate subscription. By subscribing you authorize
            recurring charges to your payment method until you cancel. Prices are exclusive of taxes, which we may
            collect where required. Fees are non-refundable except where required by law. We may change prices with
            notice; changes apply to your next billing cycle.
          </P>
          <P>
            <span className="font-semibold">Cancellation.</span> You may cancel anytime from your billing settings or the
            customer portal; cancellation takes effect at the end of the current billing period, and you retain access
            until then. We may suspend or terminate accounts for non-payment or breach of these Terms.
          </P>
          <P>
            <span className="font-semibold">Availability.</span> We work to keep the service available and reliable but
            do not guarantee uninterrupted or error-free operation. We may modify, add, or discontinue features, and may
            perform maintenance, with reasonable notice where practical.
          </P>
        </section>

        {/* 4 — Acceptable use */}
        <section className="mt-10 space-y-3">
          <H2 id="acceptable-use">4. Acceptable use</H2>
          <P>You agree not to, and not to allow others to:</P>
          <UL>
            <li>use the services for any unlawful, harmful, deceptive, or infringing purpose;</li>
            <li>send spam or unsolicited messages, or use captured contacts in violation of applicable marketing, email, or SMS laws (including CAN-SPAM, TCPA, CASL, and GDPR/ePrivacy);</li>
            <li>capture, upload, or process personal data without the notices and consents required by law;</li>
            <li>copy, reverse engineer, resell, or create derivative works from Chapter, or use it to build a competing product;</li>
            <li>interfere with, probe, or attempt to bypass the security or integrity of our systems; or</li>
            <li>infringe the intellectual-property or privacy rights of others.</li>
          </UL>
          <P>
            You are responsible for obtaining any consents required to install tracking on your properties and to
            contact the people whose information you collect. Our consent tools (e.g. the opt-in checkbox / Yes-No
            prompt) are provided to help, but you remain responsible for lawful use of the data you capture.
          </P>
        </section>

        {/* 5 — Chapter technology */}
        <section className="mt-10 space-y-3">
          <H2 id="chapter">5. Chapter technology</H2>
          <P>
            <span className="font-semibold">How it works.</span> Chapter operates by installing event-tracking scripts
            or server endpoints within your digital properties (the preferred method is first-party hosting in your own
            environment), which communicate with afG-operated APIs and infrastructure that store and analyze event data.
          </P>
          <P>
            <span className="font-semibold">Your data, your ownership.</span> You retain full ownership of the raw event
            data generated from your properties, your business data transmitted to Chapter, and any of your users&rsquo;
            or customers&rsquo; data processed through Chapter. afG does not claim ownership of your raw event data.
          </P>
          <P>
            <span className="font-semibold">Aggregated / benchmark data.</span> Chapter may generate aggregated,
            anonymized, de-identified data derived from use of the system. This aggregated data does not include personal
            information and will not identify you or let a third party reasonably infer your identity or proprietary
            information. afG owns this aggregated data and may use it to operate, improve, benchmark, and research the
            Chapter platform.
          </P>
          <P>
            <span className="font-semibold">License &amp; IP.</span> afG grants you a limited, non-exclusive,
            non-transferable license to use Chapter for measurement, analytics, and the tools&rsquo; intended purpose.
            Chapter&rsquo;s tracking architecture, APIs, analytics systems, and methodologies are afG&rsquo;s proprietary
            intellectual property. You may not copy, reverse engineer, redistribute, or commercially exploit Chapter, or
            build derivative analytics systems on its infrastructure. Unauthorized use is a material breach and may
            result in immediate suspension plus any remedies available at law or equity.
          </P>
        </section>

        {/* 6 — Captured leads */}
        <section className="mt-10 space-y-3">
          <H2 id="leads">6. Contacts you capture (&ldquo;Leads&rdquo;)</H2>
          <P>
            When a visitor submits their email or phone through your prompt, you are the controller of that contact and
            afG processes it on your behalf, on your instructions. You are responsible for the notices and consents
            required to collect and use it.
          </P>
          <UL>
            <li>We store captured contacts only short-term. On a recurring basis we email you a CSV of your leads and then delete them from Chapter &mdash; the CSV is your record.</li>
            <li>Where a visitor declines consent, we capture and flag that choice so it&rsquo;s visible to you; you are responsible for honoring it (e.g. not adding declined contacts to marketing).</li>
            <li>Identifiers may also be hashed (one-way) into the identity graph for attribution; a hash is not personal information you can reverse for a new contact.</li>
          </UL>
        </section>

        {/* 7 — Fees */}
        <section className="mt-10 space-y-3">
          <H2 id="fees">7. Fees &amp; payment</H2>
          <P>
            Agency fees are set in your SOW and billed on the cycle it specifies (typically monthly). Self-serve fees are
            billed monthly through Stripe as described in Section&nbsp;3. Applicable taxes may be added. Late or failed
            payments may result in suspension of the affected services until resolved.
          </P>
        </section>

        {/* 8 — IP + deliverables */}
        <section className="mt-10 space-y-3">
          <H2 id="ip">8. Intellectual property &amp; deliverables</H2>
          <P>
            You retain ownership of your pre-existing materials and data. afG retains ownership of its proprietary
            methodologies, frameworks, tools, and the Chapter platform. Upon full payment, you are granted a perpetual,
            non-exclusive license to use deliverables created specifically for you under an SOW for your internal
            business purposes. afG may reuse general, non-confidential learnings and methodologies provided no
            Client-specific or confidential information is disclosed. If you give us feedback, you grant us a
            royalty-free license to use it to improve our products.
          </P>
        </section>

        {/* 9 — No guarantee */}
        <section className="mt-10 space-y-3">
          <H2 id="no-guarantee">9. No guarantee of results</H2>
          <P>
            Marketing and business outcomes depend on many factors beyond our control. We make no guarantee of
            performance, revenue, growth, or specific results. Our obligation is to provide services in a commercially
            reasonable and professional manner consistent with industry standards and agreed goals.
          </P>
        </section>

        {/* 10 — Disclaimers */}
        <section className="mt-10 space-y-3">
          <H2 id="disclaimers">10. Disclaimers</H2>
          <P>
            To the maximum extent permitted by law, the website, services, and Chapter are provided &ldquo;as is&rdquo;
            and &ldquo;as available,&rdquo; without warranties of any kind, whether express or implied, including
            merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the services
            will be uninterrupted, secure, or error-free, or that any analytics or attribution output is complete or
            accurate for every use.
          </P>
        </section>

        {/* 11 — Liability */}
        <section className="mt-10 space-y-3">
          <H2 id="liability">11. Limitation of liability</H2>
          <P>
            To the maximum extent permitted by law: afG will not be liable for any indirect, incidental, special,
            consequential, or punitive damages, or for lost profits, revenue, or data. afG&rsquo;s total liability
            arising out of or relating to the services will not exceed the fees you paid to afG in the three (3) months
            preceding the event giving rise to the claim. These limits do not apply to liability that cannot be limited by
            law, or to afG&rsquo;s gross negligence or willful misconduct.
          </P>
        </section>

        {/* 12 — Indemnification */}
        <section className="mt-10 space-y-3">
          <H2 id="indemnification">12. Indemnification</H2>
          <P>
            You will indemnify and hold afG harmless from third-party claims arising out of your content or data, your
            use of the services, your marketing to contacts you capture, or your failure to obtain required consents or
            comply with law. afG will indemnify you for third-party claims arising from afG&rsquo;s material breach of its
            confidentiality or data-protection obligations.
          </P>
        </section>

        {/* 13 — Confidentiality */}
        <section className="mt-10 space-y-3">
          <H2 id="confidentiality">13. Confidentiality</H2>
          <P>
            Each party may access the other&rsquo;s non-public information. Confidential Information includes business,
            marketing, pricing, creative, performance, customer, and personal data disclosed by a party. The receiving
            party will use it only to perform under these Terms, protect it with reasonable safeguards, and not disclose
            it except to those who need it and are bound by similar obligations. afG will not use your data to train
            models or inform work for other clients without your prior written consent. These obligations survive
            termination. Data-handling details are in our{" "}
            <Link href="/privacy" className="font-semibold text-orange-600 hover:text-orange-700">Privacy Policy</Link>.
          </P>
        </section>

        {/* 14 — Term & termination */}
        <section className="mt-10 space-y-3">
          <H2 id="termination">14. Term &amp; termination</H2>
          <P>
            <span className="font-semibold">Agency.</span> An SOW commences on its start date and continues per its
            terms; unless the SOW says otherwise, there is an initial two-month term, after which it continues
            month-to-month, terminable by either party on 30 days&rsquo; written notice. Either party may terminate
            immediately for a material breach that remains uncured after written notice.
          </P>
          <P>
            <span className="font-semibold">Self-serve.</span> You may cancel anytime (Section&nbsp;3). We may suspend or
            terminate for non-payment or breach.
          </P>
          <P>
            <span className="font-semibold">Effect of termination.</span> You are responsible for removing or disabling
            any Chapter tracking scripts on your systems; afG will stop processing new event data from your properties;
            and you may request deletion of stored raw data per our retention practices. Previously generated aggregated
            benchmark data may be retained by afG. Provisions that by their nature should survive (e.g. IP,
            confidentiality, liability, indemnification) survive termination.
          </P>
        </section>

        {/* 15 — Misc */}
        <section className="mt-10 space-y-3">
          <H2 id="misc">15. General</H2>
          <UL>
            <li><span className="font-semibold">Independent contractor.</span> afG is an independent contractor; nothing here creates a partnership, joint venture, or employment relationship.</li>
            <li><span className="font-semibold">Changes to these Terms.</span> We may update these Terms; material changes take effect on the date posted, and your continued use means you accept them.</li>
            <li><span className="font-semibold">Governing law.</span> These Terms are governed by the laws of the state specified in your governing agreement, or otherwise the Commonwealth of Pennsylvania, USA, without regard to conflict-of-law principles.</li>
            <li><span className="font-semibold">Entire agreement; severability.</span> These Terms, plus any SOW or signed agreement, are the entire agreement on their subject matter. If any provision is unenforceable, the rest remains in effect.</li>
          </UL>
        </section>

        {/* 16 — Contact */}
        <section className="mt-10 space-y-3">
          <H2 id="contact">16. Contact</H2>
          <P>
            Questions about these Terms? Email{" "}
            <a href="mailto:katoa@ads4good.com" className="font-semibold text-orange-600 hover:text-orange-700">
              katoa@ads4good.com
            </a>
            .
          </P>
        </section>

        <p className="mt-12 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500">
          Provided for transparency; not legal advice. For a signed engagement, the executed Services Agreement / SOW is
          the controlling contract.
        </p>
      </div>
    </main>
  );
}
