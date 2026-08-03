import ContactPageClient from "./ContactPageClient";

export const metadata = {
  alternates: { canonical: "https://www.ads4good.com/contact" },
  title: "contact ads for Good | People & Business Questions",
  description:
    "Get in touch for education, privacy, information, consulting, or anything else. We'd love to hear from you.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
  