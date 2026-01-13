export default function sitemap() {
    const baseUrl = "https://ads4good.com";
    const lastModified = new Date();
  
    return [
      // Core pages
      { url: `${baseUrl}/`, lastModified },
      { url: `${baseUrl}/about`, lastModified },
      { url: `${baseUrl}/for-good`, lastModified },
  
      // For People
      { url: `${baseUrl}/for-people`, lastModified },
      { url: `${baseUrl}/for-people/education`, lastModified },
      { url: `${baseUrl}/for-people/privacy-protection`, lastModified },
      { url: `${baseUrl}/for-people/ad-network`, lastModified },
  
      // For Businesses (hub)
      { url: `${baseUrl}/for-businesses`, lastModified },
  
      // Ideas & Guidance
      { url: `${baseUrl}/for-businesses/marketing-advice`, lastModified },
      { url: `${baseUrl}/for-businesses/consulting`, lastModified },
      { url: `${baseUrl}/for-businesses/marketing-guidebook`, lastModified },
      { url: `${baseUrl}/for-businesses/digital-health-check`, lastModified },
  
      // Execution & Services
      { url: `${baseUrl}/for-businesses/website-builds-updates`, lastModified },
      { url: `${baseUrl}/for-businesses/digital-profile-management`, lastModified },
      { url: `${baseUrl}/for-businesses/seo-services`, lastModified },
      { url: `${baseUrl}/for-businesses/digital-ads`, lastModified },
      { url: `${baseUrl}/for-businesses/direct-mail`, lastModified },
  
      // Ongoing / Retainer
      { url: `${baseUrl}/for-businesses/marketing-team`, lastModified },
  
      // Contact
      { url: `${baseUrl}/contact`, lastModified },
    ];
  }
  
  