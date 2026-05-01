const fs = require('fs');
const path = require('path');

const dir = __dirname;

// This filters for .html files AND ignores Mac metadata files starting with "._"
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !f.startsWith('._'));

const seoTags = `
    <meta property="og:title" content="Scepter Nexus">
    <meta property="og:description" content="Scepter Nexus works with all sizes of businesses local, small, medium, large etc.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.scepternexus.com">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
`;

files.forEach(file => {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');

    // 1. Check if the specific OG title is already present to prevent duplicate injections
    if (!content.includes('property="og:title"')) {
        // This regex ensures we insert the tags right after the opening <head> tag
        content = content.replace(/<head>/i, `<head>${seoTags}`);
        console.log(`Injected SEO tags into: ${file}`);
    } else {
        console.log(`SEO tags already present in: ${file}. Skipping injection.`);
    }

    // 2. Globally update any email addresses to tosin@scepternexus.com
    // This regex looks for standard email patterns
    const emailRegex = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(content)) {
        content = content.replace(emailRegex, 'tosin@scepternexus.com');
        console.log(`Updated email addresses in: ${file}`);
    }

    // 3. Save the file
    try {
        fs.writeFileSync(p, content);
    } catch (err) {
        console.error(`Error saving ${file}:`, err.message);
    }
});

console.log('--- Process Complete ---');