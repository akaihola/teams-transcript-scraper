#!/bin/bash

# This script creates a bookmarklet from scraper.js
# It is automatically run by a Git hook when scraper.js is committed

# Function to create bookmarklet
create_bookmarklet() {
    # Read the content of scraper.js
    content=$(cat scraper.js)

    # Remove comments and newlines, and escape single quotes
    minified=$(echo "$content" | sed 's/\/\/.*$//' | tr -d '\n' | sed "s/'/\\\'/g")

    # Create the bookmarklet
    bookmarklet="javascript:(function(){$minified})();"

    # Save the bookmarklet to a file
    echo "$bookmarklet" > bookmarklet.js

    echo "Bookmarklet created and saved to bookmarklet.js"
}

# Create the bookmarklet
create_bookmarklet
