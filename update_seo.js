const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const seoTags = `
    <!-- Global SEO Meta Tags -->
    <meta property="og:title" content="Scepter Nexus | Financial Intelligence">
    <meta property="og:description" content="Scepter Nexus helps modern companies gain financial clarity through strategic accounting, tax optimization, and AI-driven financial insights.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.scepternexus.com/">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
`;

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('og:title')) {
        content = content.replace('</head>', `${seoTags}\n</head>`);
        fs.writeFileSync(p, content);
        console.log('Updated SEO for', file);
    }
});
