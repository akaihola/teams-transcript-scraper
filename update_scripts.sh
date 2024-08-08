#!/usr/bin/env bash

# This script creates a bookmarklet from scraper.js and updates the user script
# It is automatically run by a Git hook when scraper.js is committed

# Function to create bookmarklet
create_bookmarklet() {
    # Read the content of scraper.js and minify it using awk
    minified=$(awk '
        BEGIN { RS="\n"; ORS="" }
        /^[[:space:]]*\/\// { next }  # Skip comments
        { gsub(/'\''/, "\\'\''")      # Escape single quotes
          gsub(/[[:space:]]+/, " ")   # Replace multiple spaces with a single space
          print $0 }
    ' scraper.js)

    # Create the bookmarklet
    bookmarklet="javascript:(function(){$minified})();"

    # Save the bookmarklet to a file
    echo "$bookmarklet" > bookmarklet.js

    echo "Bookmarklet created and saved to bookmarklet.js"
}

# Function to update user script
update_user_script() {
    # Update user script
    awk '
    BEGIN {
        RS = "\n"
        scraper_content = ""
        while ((getline line < "scraper.js") > 0) {
            scraper_content = scraper_content line "\n"
        }
        close("scraper.js")
    }
    /^[[:space:]]*\/\/ START SCRAPER CONTENT/ {
        print
        gsub(/^/, "        ", scraper_content)
        printf "%s", scraper_content
        in_scraper_content = 1
        next
    }
    /^[[:space:]]*\/\/ END SCRAPER CONTENT/ {
        in_scraper_content = 0
    }
    !in_scraper_content
    ' teams_transcript_downloader.user.js > temp && mv temp teams_transcript_downloader.user.js

    echo "User script updated with new scraper content"
}

# Create the bookmarklet
create_bookmarklet

# Update the user script
update_user_script
