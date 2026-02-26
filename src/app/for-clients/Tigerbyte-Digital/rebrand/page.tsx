import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pillars from "./components/Pillars";
import ArticlesStrip from "./components/ArticlesStrip";
import RaveAccordion from "./components/RaveAccordion";
import ProudPartners from "./components/ProudPartners";
import ContactCTA from "./components/ContactCTA";
import Footer from "./components/Footer";
import TestimonialFlipStrip from "./components/TestimonialFlipStrip";

export default function TigerbyteRebrandPage() {
    return (
      <main>
        {/* 1) Header */}
        <Header />
  
        {/* 2) Hero (left headline + right stat + row under) */}
        <Hero />
  
        {/* 3) Services tiles section */}
       <Services />
  
        {/* 4) Pillars / “What publishers crave” */}
        <Pillars />
  
        {/* 5) Articles scroller + mini case study accordion */}
        <ArticlesStrip />
  
        {/* 6) Mini Case Study Accordion */}
        <RaveAccordion />
        <TestimonialFlipStrip />

         {/* 7) Partner Logos */}
         <ProudPartners />

         {/* 8) Contact CTA */}
         <ContactCTA />
  
        {/* Footer */}
        <Footer />

        </main>
    );
  }