import glob

for filepath in glob.glob('*.html'):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        if '<button class="mobile-menu-btn"' not in content:
            # We will insert it just before <div class="nav-links">
            replacement = """            <button class="mobile-menu-btn" aria-label="Toggle navigation">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <div class="nav-links">"""
            content = content.replace('<div class="nav-links">', replacement)
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error in {filepath}: {e}")
