// Background script for YouTube Brainrot Split Screen Extension

let isFullscreenActive = false;

// Listen for tab updates to detect fullscreen changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('youtube.com')) {
    // Send message to content script to check fullscreen status
    chrome.tabs.sendMessage(tabId, { action: 'checkFullscreen' }).catch(() => {
      // Ignore errors if content script is not ready
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fullscreenChanged') {
    isFullscreenActive = message.isFullscreen;
    console.log('Fullscreen status changed:', isFullscreenActive);
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Brainrot Split Screen Extension installed');
});
