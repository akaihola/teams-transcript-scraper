// ==UserScript==
// @name         Teams Transcript Downloader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Download Microsoft Teams meeting transcripts
// @match        https://teams.microsoft.com/v2/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // ZONE 1: USERSCRIPT INFRASTRUCTURE
    // ============================================

    /**
     * Utility function to find the transcript panel element
     * Implements selector fallback strategy for robustness
     * 
     * Priority order:
     * 1. #scrollToTargetTargetedFocusZone (PRIMARY - proven in scraper.js)
     * 2. #OneTranscript (FALLBACK - semantic ID fallback)
     * 
     * @returns {HTMLElement|null} The transcript panel element or null if not found
     */
    function findTranscriptPanel() {
        // Try primary selector (most stable, semantic ID)
        const primaryPanel = document.getElementById('scrollToTargetTargetedFocusZone');
        if (primaryPanel) {
            return primaryPanel;
        }

        // Try fallback selector (semantic ID, secondary option)
        const fallbackPanel = document.getElementById('OneTranscript');
        if (fallbackPanel) {
            return fallbackPanel;
        }

        // Neither selector found
        return null;
    }

    /**
     * Create and inject the floating download button into the transcript UI
     * Creates a fixed-position button with enabled/disabled states
     * 
     * @returns {void}
     */
    function createFloatingButton() {
        if (document.getElementById('teams-transcript-download-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'teams-transcript-download-btn';
        button.innerHTML = '⬇️';
        button.title = 'No transcript available';
        
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            background-color: #ccc;
            color: #666;
            cursor: not-allowed;
            opacity: 0.5;
        `;

        button.dataset.enabled = 'false';
        
        button.addEventListener('mouseenter', () => {
            if (button.dataset.enabled === 'true') {
                button.style.transform = 'scale(1.1)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        document.body.appendChild(button);

        // Define public API for enabling/disabling (attached to element)
        button.enable = function() {
            this.dataset.enabled = 'true';
            this.disabled = false;
            this.title = 'Download Transcript';
            this.style.backgroundColor = '#6264A7'; // Teams purple
            this.style.color = 'white';
            this.style.cursor = 'pointer';
            this.style.opacity = '1';
        };

        button.disable = function() {
            this.dataset.enabled = 'false';
            this.disabled = true;
            this.title = 'No transcript available';
            this.style.backgroundColor = '#ccc';
            this.style.color = '#666';
            this.style.cursor = 'not-allowed';
            this.style.opacity = '0.5';
        };

        button.addEventListener('click', handleDownloadClick);
    }

    /**
     * Setup MutationObserver to detect when transcript panel becomes available
     * TODO (Task 4): Implement DOM monitoring for dynamic transcript loading
     * 
     * @returns {void}
     */
    function setupTranscriptDetection() {
        // TODO: Implement MutationObserver
        // - Watch for additions of #scrollToTargetTargetedFocusZone
        // - Watch for additions of #OneTranscript
        // - Call createFloatingButton() when transcript is detected
        // - Re-check on DOM mutations to handle dynamic loading
    }

    /**
     * Handle the download button click event
     * Initiates the transcript extraction and download process
     * TODO (Task 5): Wire this up to actual button click handler
     * 
     * @returns {void}
     */
    function handleDownloadClick() {
        // TODO: Implement click handler
        // - Prevent default action
        // - Show loading indicator
        // - Call runScraperScript()
        // - Handle errors gracefully
    }

    // ============================================
    // ZONE 2: SCRAPER CONTENT (AUTO-SYNCED)
    // ============================================

    /**
     * Main scraper function - extracts and downloads transcript content
     * This content is automatically synced with scraper.js via update_scripts.sh
     * DO NOT EDIT DIRECTLY - edit scraper.js and run update_scripts.sh
     */
    async function runScraperScript() {
        // START SCRAPER CONTENT
        async function extractListContent() {
    // Get the meeting title
    const meetingTitle = document.querySelector('h2[data-tid="chat-title"] span')?.textContent.trim() || 'Teams Meeting';
    const scrollToTarget = document.getElementById('scrollToTargetTargetedFocusZone');
    if (!scrollToTarget) {
        console.log('scrollToTarget element not found');
        return;
    }

    let listContent = '';
    let lastItemIndex = 0;
    let lastOffsetTop = 0;
    let retry = 20;

    while (retry) {
        const currentItem = document.getElementById(`listItem-${lastItemIndex}`);

        if (!currentItem) {
            scrollToTarget.scrollTop = lastOffsetTop;

            try {
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error("Error in setTimeout:", error);
            }

            retry--;
            continue;
        }

        retry = 20;
        lastOffsetTop = currentItem.offsetTop;

        const authorName = currentItem.querySelector('span[class^="itemDisplayName-"]');
        const timestamp = currentItem.querySelector('span[id^="Header-timestamp-"]');
        const messages = [...currentItem.querySelectorAll('div[id^="sub-entry-"]')].map(el => el.textContent.trim());

        if (authorName || timestamp) {
            listContent += `**${timestamp.textContent.trim()}** ${authorName.textContent.trim()}\n`;
        }

        listContent += `${messages.join('\n')}\n\n`;
        lastItemIndex++;
    }

    return { content: listContent, title: meetingTitle };
}

function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

const { content, title } = await extractListContent();
console.log(content);  // Still log the content to the console

// Download the content as a Markdown file
const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/^\.+/, '').replace(/\.+$/, '').trim();
const maxLength = 251; // 255 - 4 characters for '.md'
const safeTitleLimited = safeTitle.slice(0, maxLength);
downloadMarkdown(content, `${safeTitleLimited || 'Teams_Meeting'}.md`);
        // END SCRAPER CONTENT
    }

    // ============================================
    // ZONE 1: INITIALIZATION
    // ============================================

    /**
     * Initialize the userscript on DOM load
     * 
     * Current flow:
     * 1. Inject disabled button immediately (createFloatingButton)
     * 2. setupTranscriptDetection() - sets up MutationObserver
     * 3. When transcript detected, button enabled state is toggled
     * 4. Button click calls handleDownloadClick() -> runScraperScript()
     */
    function initialize() {
        createFloatingButton();
        setupTranscriptDetection();
    }

    // Initialize when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
