const fs = require('fs');
const path = require('path');

// Define your domains
const DOMAINS = {
  primary: 'https://risingnetwork.com',
  regional: 'https://risingnetwork.in'
};

// Define all pages in your app
const PAGES = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/explore', priority: 0.9, changefreq: 'daily' },
  { url: '/search', priority: 0.8, changefreq: 'weekly' },
  { url: '/profile', priority: 0.8, changefreq: 'weekly' },
  { url: '/connections', priority: 0.8, changefreq: 'weekly' },
  { url: '/teams', priority: 0.9, changefreq: 'daily' },
  { url: '/create-team', priority: 0.7, changefreq: 'weekly' },
  { url: '/projects', priority: 0.7, changefreq: 'weekly' },
  { url: '/team-invitations', priority: 0.7, changefreq: 'weekly' },
  { url: '/my-invitations', priority: 0.7, changefreq: 'weekly' },
  { url: '/college-team', priority: 0.6, changefreq: 'monthly' },
];

// Generate sitemap XML
function generateSitemap(domain) {
  const urls = PAGES.map(page => `
    <url>
      <loc>${domain}${page.url}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>${page.changefreq}</changefreq>
      <priority>${page.priority}</priority>
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// Write sitemaps
function writeSitemaps() {
  // Primary domain sitemap
  const primarySitemap = generateSitemap(DOMAINS.primary);
  fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), primarySitemap);
  console.log('✅ Generated sitemap.xml for risingnetwork.com');

  // Regional domain sitemap (optional)
  const regionalSitemap = generateSitemap(DOMAINS.regional);
  fs.writeFileSync(path.join(__dirname, '../public/sitemap-in.xml'), regionalSitemap);
  console.log('✅ Generated sitemap-in.xml for risingnetwork.in');

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

# Primary domain
Sitemap: https://risingnetwork.com/sitemap.xml

# Regional domain (if separate)
Sitemap: https://risingnetwork.in/sitemap-in.xml`;
  
  fs.writeFileSync(path.join(__dirname, '../public/robots.txt'), robotsTxt);
  console.log('✅ Generated robots.txt');
}

// Run the generator
writeSitemaps();
console.log('🎉 SEO files generated successfully!');
console.log('\n📋 Next steps:');
console.log('1. Upload sitemap.xml to risingnetwork.com root');
console.log('2. Set up domain forwarding: risingnetwork.in → risingnetwork.com');
console.log('3. Submit sitemaps to Google Search Console');
console.log('4. Monitor SEO performance');
