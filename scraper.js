async function extractListContent() {
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

    return listContent;
}

console.log(await extractListContent());
