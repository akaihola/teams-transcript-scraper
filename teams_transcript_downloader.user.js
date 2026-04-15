// ==UserScript==
// @name         Teams Transcript Downloader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Download Microsoft Teams meeting transcripts
// @match        https://teams.microsoft.com/v2/*
// @match        https://*.sharepoint.com/*/_layouts/*/xplatplugins.aspx*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Debug configuration
    const DEBUG_PREFIX = '[TTD]'; // Teams Transcript Downloader
    const DEBUG_ENABLED = false;

    function debug(...args) {
        if (DEBUG_ENABLED) console.log(DEBUG_PREFIX, ...args);
    }
    function debugWarn(...args) {
        if (DEBUG_ENABLED) console.warn(DEBUG_PREFIX, ...args);
    }
    function debugError(...args) {
        if (DEBUG_ENABLED) console.error(DEBUG_PREFIX, ...args);
    }

    debug('🚀 Userscript loaded at', new Date().toISOString());
    debug('📍 URL:', window.location.href);
    debug('📄 Document readyState:', document.readyState);
    debug('📦 document.body exists:', !!document.body);

    const isInIframe = (() => {
        try { return window.self !== window.top; }
        catch (e) { return true; }
    })();
    debug('🖼️ Running in iframe:', isInIframe);

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
        debug('🔍 findTranscriptPanel() called');

        // Try primary selector (most stable, semantic ID)
        const primaryPanel = document.getElementById('scrollToTargetTargetedFocusZone');
        if (primaryPanel) {
            debug('✅ Found primary panel: #scrollToTargetTargetedFocusZone');
            return primaryPanel;
        }
        debug('❌ Primary selector not found');

        // Try fallback selector (semantic ID, secondary option)
        const fallbackPanel = document.getElementById('OneTranscript');
        if (fallbackPanel) {
            debug('✅ Found fallback panel: #OneTranscript');
            return fallbackPanel;
        }
        debug('❌ Fallback selector not found');

        debug('⚠️ No transcript panel found');
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
        debug('🔘 createFloatingButton() called');

        const existing = document.getElementById('teams-transcript-download-btn');
        if (existing) {
            debug('⏭️ Button already exists, skipping creation');
            return;
        }

        debug('📝 Creating new button element...');
        const button = document.createElement('button');
        button.id = 'teams-transcript-download-btn';
        button.textContent = '⬇️';
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

        debug('📍 Checking document.body:', !!document.body);
        if (!document.body) {
            debugError('❌ document.body is null! Cannot append button.');
            return;
        }

        document.body.appendChild(button);
        debug('✅ Button appended to document.body');
        debug('🔍 Verification:', !!document.getElementById('teams-transcript-download-btn'));

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
     * Monitors document.body for subtree changes and toggles button state accordingly
     *
     * @returns {void}
     */
    function setupTranscriptDetection() {
        debug('👁️ setupTranscriptDetection() called');

        let debounceTimer;
        let checkCount = 0;

        function checkTranscript() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                checkCount++;
                debug(`🔄 checkTranscript() #${checkCount}`);

                const transcriptPanel = findTranscriptPanel();
                const button = document.getElementById('teams-transcript-download-btn');

                debug('  📋 transcriptPanel:', !!transcriptPanel);
                debug('  🔘 button:', !!button);

                if (!button) {
                    debugWarn('  ⚠️ Button not found in DOM!');
                    return;
                }

                if (transcriptPanel) {
                    debug('  ✅ Enabling button');
                    button.enable();
                } else {
                    debug('  ❌ Disabling button');
                    button.disable();
                }
            }, 150);
        }

        debug('📡 Creating MutationObserver...');
        // Create and start the MutationObserver
        const observer = new MutationObserver(() => {
            checkTranscript();
        });

        debug('👀 Starting observation on document.body');
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        debug('🔍 Performing initial check...');
        // Perform initial check in case transcript is already present
        checkTranscript();
    }

      /**
       * Handle the download button click event
       * Initiates the transcript extraction and download process
       *
       * Flow:
       * 1. Get button reference from DOM
       * 2. Check if button is enabled (early exit if disabled)
       * 3. Disable button and show loading state (⏳)
       * 4. Call async runScraperScript() to extract and download
       * 5. Handle errors gracefully with user alert
       * 6. Always re-enable button and restore state in finally block
       * 7. Re-check transcript availability in case user navigated away
       *
       * @returns {void}
       */
      function handleDownloadClick() {
          debug('🖱️ handleDownloadClick() called');

          // Get button reference
          const button = document.getElementById('teams-transcript-download-btn');
          debug('  🔘 button found:', !!button);
          if (!button) return;

          debug('  📊 button.disabled:', button.disabled);
          debug('  📊 button.dataset.enabled:', button.dataset.enabled);

          // If disabled, don't proceed
          if (button.disabled || button.dataset.enabled === 'false') {
              debug('  ⛔ Button is disabled, returning early');
              return;
          }

          debug('  ✅ Button is enabled, proceeding with download...');

        // Store original state for restoration
        const originalText = button.textContent;

        // Disable button to prevent multiple simultaneous clicks
        button.disabled = true;
        button.dataset.enabled = 'false';
        button.style.cursor = 'not-allowed';
        button.textContent = '⏳'; // Show loading indicator

          // Execute async scraper in a separate scope
          (async () => {
              try {
                  debug('Starting transcript extraction...');

                  // Call the scraper function (defined in Zone 2)
                  await runScraperScript();

                  debug('Transcript download completed successfully');
              } catch (error) {
                  debugError('Error downloading transcript:', error);
                  alert('Error downloading transcript. Check the console for details.');
            } finally {
                // Restore button state
                button.textContent = originalText;
                  button.disabled = false;
                  button.style.cursor = 'pointer';

                  // Re-check if transcript is still available
                  // (user may have navigated away during download)
                  const transcriptPanel = findTranscriptPanel();
                  if (transcriptPanel) {
                      // Transcript still available - keep button enabled
                      button.dataset.enabled = 'true';
                  } else {
                      // Transcript no longer available - disable button
                      debug('Transcript panel no longer detected after download');
                      button.disable();
                  }
              }
          })();
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
    const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    let meetingDate = '';
    let meetingTitle = 'Teams Meeting';

    // Detect iframe context (transcript may live in a SharePoint iframe)
    const inIframe = (() => {
        try { return window.self !== window.top; }
        catch (e) { return true; }
    })();

    if (inIframe) {
        // Request meeting info from the parent Teams frame via postMessage.
        // The userscript running in the parent frame responds with title/date.
        // Falls back to defaults after 2 s timeout (e.g. bookmarklet use).
        const parentInfo = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            const handler = (event) => {
                if (event.data && event.data.type === 'TTD_MEETING_INFO') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'TTD_REQUEST_MEETING_INFO' }, '*');
        });

        if (parentInfo) {
            meetingTitle = parentInfo.title || meetingTitle;
            meetingDate = parentInfo.date || meetingDate;
        }
    } else {
        // Main frame: get meeting info directly from Teams DOM
        const dateTimeSpan = document.querySelector('[data-tid="intelligent-recap-header"] span[dir="auto"]');
        if (dateTimeSpan) {
            const dateTimeText = dateTimeSpan.textContent.trim();
            const dateMatch = dateTimeText.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/);
            if (dateMatch) {
                const [, , monthName, day, year] = dateMatch;
                meetingDate = `${year}-${months[monthName] || '01'}-${day.padStart(2, '0')}`;
            }
        }

        const entityHeaderTitle = document.querySelector('[data-tid="entity-header"] span[dir="auto"]');
        const chatTitle = document.querySelector('h2[data-tid="chat-title"] span');
        meetingTitle = entityHeaderTitle?.textContent.trim() || chatTitle?.textContent.trim() || 'Teams Meeting';
    }

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

    return { content: listContent, title: meetingTitle, date: meetingDate };
}

function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

const { content, title, date } = await extractListContent();
console.log(content);  // Still log the content to the console

// Build filename: "YYYY-MM-DD Title.md" or "Title.md" if no date
const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/^\.+/, '').replace(/\.+$/, '').trim();
const datePrefix = date ? `${date} ` : '';
const maxLength = date ? 240 : 251;
const safeTitleLimited = safeTitle.slice(0, maxLength);
downloadMarkdown(content, `${datePrefix}${safeTitleLimited || 'Teams_Meeting'}.md`);
        // END SCRAPER CONTENT
    }

    // ============================================
    // ZONE 1: INITIALIZATION
    // ============================================

    /**
     * Respond to postMessage requests from the iframe with meeting title/date.
     * The transcript lives in a cross-origin SharePoint iframe that cannot
     * access the Teams DOM, so we bridge the info via postMessage.
     */
    function setupMeetingInfoResponder() {
        const months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };

        window.addEventListener('message', (event) => {
            if (!event.data || event.data.type !== 'TTD_REQUEST_MEETING_INFO') return;
            debug('📨 Received meeting info request from iframe');

            let meetingDate = '';
            const dateTimeSpan = document.querySelector('[data-tid="intelligent-recap-header"] span[dir="auto"]');
            if (dateTimeSpan) {
                const dateTimeText = dateTimeSpan.textContent.trim();
                const dateMatch = dateTimeText.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/);
                if (dateMatch) {
                    const [, , monthName, day, year] = dateMatch;
                    meetingDate = `${year}-${months[monthName] || '01'}-${day.padStart(2, '0')}`;
                }
            }

            const entityHeaderTitle = document.querySelector('[data-tid="entity-header"] span[dir="auto"]');
            const chatTitle = document.querySelector('h2[data-tid="chat-title"] span');
            const meetingTitle = entityHeaderTitle?.textContent.trim() || chatTitle?.textContent.trim() || '';

            event.source.postMessage({
                type: 'TTD_MEETING_INFO',
                title: meetingTitle,
                date: meetingDate
            }, '*');
            debug('📤 Sent meeting info:', meetingTitle, meetingDate);
        });
    }

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
        debug('🎬 initialize() called');
        debug('  📄 readyState:', document.readyState);
        debug('  📦 body exists:', !!document.body);

        try {
            if (!isInIframe) {
                debug('  📡 Setting up meeting info responder (main frame only)');
                setupMeetingInfoResponder();
                debug('✅ Main frame initialization complete (no button)');
                return;
            }
            debug('  1️⃣ Calling createFloatingButton()...');
            createFloatingButton();
            debug('  2️⃣ Calling setupTranscriptDetection()...');
            setupTranscriptDetection();
            debug('✅ Iframe initialization complete');
        } catch (error) {
            debugError('❌ Initialization failed:', error);
            debugError('  Stack:', error.stack);
        }
    }

    // Initialize when document is ready
    debug('⏳ Checking document.readyState:', document.readyState);
    if (document.readyState === 'loading') {
        debug('  → Document still loading, adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', () => {
            debug('📢 DOMContentLoaded event fired');
            initialize();
        });
    } else {
        debug('  → Document already loaded, initializing immediately');
        initialize();
    }

})();
