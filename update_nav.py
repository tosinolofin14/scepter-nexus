import glob
import re

for filepath in glob.glob('*.html'):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Check if already added
        if 'class="mobile-only-link"' not in content:
            # Finding the end of nav-links div
            # Normally looks like: <a href="pricing.html">Pricing</a>\n            </div>\n            <div class="nav-actions">
            pattern = re.compile(r'(<a[^>]*>[^<]*</a>\s*)(</div>\s*<div class="nav-actions">)')
            content = pattern.sub(r'\1    <a href="portal.html" class="mobile-only-link">Client Portal</a>\n            \2', content)
        
        # Add desktop-only-link to navbar Client Portal
        content = content.replace('class="btn btn-black btn-sm">Client Portal', 'class="btn btn-black btn-sm desktop-only-link">Client Portal')
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error in {filepath}: {e}")
