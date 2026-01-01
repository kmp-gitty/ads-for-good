export default function sitemap() {
    const baseUrl = "https://ads4good.com";
  
    return [
      { url: `${baseUrl}/`, lastModified: new Date() },
      { url: `${baseUrl}/about`, lastModified: new Date() },
      { url: `${baseUrl}/for-good`, lastModified: new Date() },
  
      // For People section
      { url: `${baseUrl}/for-people`, lastModified: new Date() },
      { url: `${baseUrl}/for-people/education`, lastModified: new Date() },
      { url: `${baseUrl}/for-people/privacy-protection`, lastModified: new Date() },
      { url: `${baseUrl}/for-people/ad-network`, lastModified: new Date() },
  
      // For Businesses section
      { url: `${baseUrl}/for-businesses`, lastModified: new Date() },
      { url: `${baseUrl}/for-businesses/ask-us-anything`, lastModified: new Date() },
      { url: `${baseUrl}/for-businesses/consulting`, lastModified: new Date() },
      { url: `${baseUrl}/for-businesses/marketing-guidebook`, lastModified: new Date() },
      { url: `${baseUrl}/for-businesses/digital-property-audit`, lastModified: new Date() },
      { url: `${baseUrl}/for-businesses/local-marketing`, lastModified: new Date() },
  
      // Contact
      { url: `${baseUrl}/contact`, lastModified: new Date() },
    ];
  }
  