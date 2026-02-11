# RisingNetwork SEO Setup Guide

## Domain Strategy
Since you own both risingnetwork.com and risingnetwork.in, here's the optimal setup:

### Option 1: Domain Forwarding (Recommended)
Forward risingnetwork.in → risingnetwork.com
- All SEO authority goes to primary domain
- Single brand identity
- Better search rankings

### Option 2: Separate Markets
- risingnetwork.com - Global/Professional audience
- risingnetwork.in - Indian/Regional market with localized content

## Implementation Steps

### 1. Domain Forwarding Setup
1. Go to your domain registrar (where you bought risingnetwork.in)
2. Set up permanent 301 redirect:
   - risingnetwork.in → https://risingnetwork.com
3. Update all backlinks to point to risingnetwork.com

### 2. SEO Configuration

#### For risingnetwork.com (Primary)
```html
<!-- Add to pages/_document.tsx -->
<NextHead>
  <title>RisingNetwork - Professional College Networking Platform</title>
  <meta name="description" content="Connect with college students, join teams, schedule meetings, and build your professional network on RisingNetwork." />
  <meta name="keywords" content="college networking, student connections, team collaboration, professional networking, campus network" />
  <meta property="og:title" content="RisingNetwork - Professional College Networking" />
  <meta property="og:description" content="Join the ultimate college networking platform for students and professionals." />
  <meta property="og:url" content="https://risingnetwork.com" />
  <link rel="canonical" href="https://risingnetwork.com" />
</NextHead>
```

#### For risingnetwork.in (Regional - if separate)
```html
<!-- Add localized content -->
<NextHead>
  <title>RisingNetwork.in - Indian College Networking Platform</title>
  <meta name="description" content="भारतीय कॉलेज नेटवर्किंग प्लेटफॉर्म। भारतीय कॉलेजों में छात्रों से जुड़ें।" />
  <meta name="keywords" content="college networking India, student connections, Indian campus network, professional networking India" />
  <meta property="og:title" content="RisingNetwork.in - Indian College Networking" />
  <meta property="og:description" content="भारत का सबसे बड़ा कॉलेज नेटवर्किंग प्लेटफॉर्म।" />
  <meta property="og:url" content="https://risingnetwork.in" />
  <link rel="canonical" href="https://risingnetwork.in" />
</NextHead>
```

## 3. Sitemap Generation

### Create sitemaps for both domains:
```bash
# Generate sitemap.xml for risingnetwork.com
# Generate sitemap.xml for risingnetwork.in
```

## 4. Search Console Setup

### Google Search Console
1. Add both properties:
   - risingnetwork.com
   - risingnetwork.in (if separate)

2. Submit sitemaps for both
3. Monitor performance for both

## 5. Local SEO (For .in domain)

If targeting Indian market with risingnetwork.in:
- Add Hindi language support
- Target Indian cities/colleges
- Use .in domain for local advantage

## 6. Technical SEO

### Next.js SEO Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'x-robots-tag',
            value: 'all'
          }
        ]
      }
    ]
  }
}
```

## 7. Content Strategy

### Primary Domain (risingnetwork.com)
- Professional networking content
- Global audience targeting
- English language focus
- Industry partnerships

### Regional Domain (risingnetwork.in) - Optional
- Indian college focus
- Localized content (Hindi/English)
- Regional events/features
- Indian college partnerships

## 8. Analytics Setup

### Track Both Domains
```javascript
// Google Analytics 4
gtag('config', 'GA_MEASUREMENT_ID', {
  domains: ['risingnetwork.com', 'risingnetwork.in']
});
```

## 9. Backlink Strategy

### Primary Focus
- Build backlinks to risingnetwork.com
- Use .com for professional partnerships
- Academic institutions prefer .com

## 10. Social Media Integration

### Unified Brand
- Use @risingnetwork handle for both
- Link to risingnetwork.com primarily
- Mention both domains where appropriate

## Recommendation: Use Domain Forwarding

**Best approach**: Forward risingnetwork.in → risingnetwork.com

**Benefits:**
- Single SEO authority
- Better search rankings
- Unified brand identity
- Easier management
- Professional credibility

**Implementation:**
1. Set up 301 redirect at domain registrar
2. Update all marketing materials
3. Focus SEO efforts on risingnetwork.com
4. Use risingnetwork.in for regional marketing campaigns
