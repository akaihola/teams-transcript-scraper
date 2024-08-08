# MS Teams Meeting Transcript Scraper

This project contains a JavaScript scraper designed to extract meeting transcripts from Microsoft Teams when using the web browser version.

## Purpose

The main purpose of this script is to scrape and extract the transcript of a Teams meeting. This can be useful for:
- Saving meeting notes for future reference
- Creating a searchable record of discussions
- Assisting with meeting minutes creation

## Usage

1. Open Microsoft Teams in your web browser and navigate to the meeting transcript you want to scrape.
2. Open the browser's developer tools (usually F12 or right-click and select "Inspect").
3. Navigate to the Console tab in the developer tools.
4. Copy and paste the contents of `scraper.js` into the console.
5. Press Enter to run the script.
6. The script will output the extracted transcript in the console.

## Features

- Extracts the full meeting transcript, including timestamps and speaker names.
- Asynchronous operation for improved performance, allowing it to handle long transcripts.
- Automatically scrolls through the transcript to ensure all content is captured.

## File Structure

- `scraper.js`: Contains the main scraping functionality for Teams meeting transcripts.

## Note

This tool is intended for personal or educational use only. Always respect Microsoft Teams' terms of service and your organization's policies regarding the use and distribution of meeting transcripts. Ensure you have the necessary permissions before extracting and sharing meeting content.
