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

    // Function to add download button
    function addDownloadButton() {
        const container = document.querySelector('.container-189');
        if (!container) return;

        const oneTranscript = container.querySelector('#OneTranscript');
        if (!oneTranscript) return;

        if (container.querySelector('#transcriptViewerControls')) return;

        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'transcriptViewerControls';
        controlsDiv.className = 'transcriptPluginCommandBar-252';
        controlsDiv.innerHTML = `
            <div style="position: relative;">
                <div data-automation-id="visibleContent">
                    <div class="ms-FocusZone css-406 ms-CommandBar root-443" role="menubar" aria-label="Transcript actions">
                        <div role="none" class="ms-OverflowSet ms-CommandBar-primaryCommand primarySet-446">
                            <div class="ms-OverflowSet-item item-447" role="none">
                                <button type="button" role="menuitem" id="downloadTranscript" class="ms-Button ms-Button--commandBar ms-CommandBarItem-link root-449" aria-label="Download">
                                    <span class="ms-Button-flexContainer flexContainer-450">
                                        <i data-icon-name="Download" aria-hidden="true" class="ms-Icon root-147 css-403 ms-Button-icon icon-452" style="font-family: StreamMDL2Icons;">⬇️</i>
                                        <span class="ms-Button-textContainer textContainer-451">
                                            <span class="ms-Button-label label-453">Download</span>
                                        </span>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertBefore(controlsDiv, oneTranscript);

        // Add event listener to the download button
        const downloadButton = controlsDiv.querySelector('#downloadTranscript');
        downloadButton.addEventListener('click', runScraperScript);
    }

    // Function to run the scraper script
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

    // Function to check for the container and add the download button
    function checkForContainer() {
        const container = document.querySelector('.container-189');
        if (container) {
            addDownloadButton();
        } else {
            setTimeout(checkForContainer, 1000); // Check again after 1 second
        }
    }

    // Start checking for the container
    checkForContainer();
})();
