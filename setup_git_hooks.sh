#!/bin/bash

# Create the pre-commit hook
cat > .git/hooks/pre-commit << EOL
#!/bin/bash

# Check if scraper.js was modified
if git diff --cached --name-only | grep -q "scraper.js"; then
    # Run the create_bookmarklet.sh script
    ./create_bookmarklet.sh

    # Add the generated bookmarklet.js to the commit
    git add bookmarklet.js
fi
EOL

# Make the pre-commit hook executable
chmod +x .git/hooks/pre-commit

echo "Git pre-commit hook has been set up successfully."
