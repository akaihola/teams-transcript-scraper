#!/usr/bin/env bash

# Create the pre-commit hook
cat > .git/hooks/pre-commit << EOL
#!/usr/bin/env bash

# Check if scraper.js was modified
if git diff --cached --name-only | grep -q "scraper.js"; then
    # Run the update_scripts.sh script
    ./update_scripts.sh

    # Add the generated bookmarklet.js and user script to the commit
    git add bookmarklet.js teams_transcript_downloader.user.js
fi
EOL

# Make the pre-commit hook executable
chmod +x .git/hooks/pre-commit

echo "Git pre-commit hook has been set up successfully."
