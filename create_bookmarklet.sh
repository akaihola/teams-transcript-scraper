#!/bin/bash

# This script creates a bookmarklet from scraper.js and updates the user script
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

# Function to update user script
update_user_script() {
    # Read the content of scraper.js
    scraper_content=$(cat scraper.js)

    # Read the content of teams_transcript_downloader.user.js
    user_script_content=$(cat teams_transcript_downloader.user.js)

    # Replace the content between the markers in the user script
    updated_content=$(echo "$user_script_content" | awk -v r="$scraper_content" '
        /\/\/ START SCRAPER CONTENT/,/\/\/ END SCRAPER CONTENT/ {
            if ($0 ~ /\/\/ START SCRAPER CONTENT/) {
                print $0
                print r
            } else if ($0 ~ /\/\/ END SCRAPER CONTENT/) {
                print $0
            } else {
                next
            }
        }
        !/\/\/ START SCRAPER CONTENT/,/\/\/ END SCRAPER CONTENT/ {
            print $0
        }
    ')

    # Save the updated content back to the user script file
    echo "$updated_content" > teams_transcript_downloader.user.js

    echo "User script updated with new scraper content"
}

# Create the bookmarklet
create_bookmarklet

# Update the user script
update_user_script
