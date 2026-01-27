async function extractListContent() {
    // Get the meeting date from the intelligent recap header
    // Format: "Tuesday, January 27, 2026 11:31 AM - 12:00 PM"
    const dateTimeSpan = document.querySelector('[data-tid="intelligent-recap-header"] span[dir="auto"]');
    let meetingDate = '';
    if (dateTimeSpan) {
        const dateTimeText = dateTimeSpan.textContent.trim();
        // Parse date like "Tuesday, January 27, 2026 11:31 AM - 12:00 PM"
        const dateMatch = dateTimeText.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d+)/);
        if (dateMatch) {
            const [, , monthName, day, year] = dateMatch;
            const months = {
                'January': '01', 'February': '02', 'March': '03', 'April': '04',
                'May': '05', 'June': '06', 'July': '07', 'August': '08',
                'September': '09', 'October': '10', 'November': '11', 'December': '12'
            };
            const month = months[monthName] || '01';
            meetingDate = `${year}-${month}-${day.padStart(2, '0')}`;
        }
    }

    // Get the meeting title from entity header (more specific selector)
    // Falls back to chat-title h2 if entity header not found
    const entityHeaderTitle = document.querySelector('[data-tid="entity-header"] span[dir="auto"]');
    const chatTitle = document.querySelector('h2[data-tid="chat-title"] span');
    const meetingTitle = entityHeaderTitle?.textContent.trim() || chatTitle?.textContent.trim() || 'Teams Meeting';

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
