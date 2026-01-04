// Embermarks - Background Script
// Handles bookmark analysis and forgotten bookmark detection

// Minimum valid timestamp (Jan 1, 2010) - older dates are likely corrupted imports
const MIN_VALID_TIMESTAMP = 1262304000000;

const DEFAULT_SETTINGS = {
  excludedFolders: [],
  numBookmarks: 5,
  maxVisitCount: 2, // Consider "forgotten" if visited 2 or fewer times
  minAgeDays: 7, // Only show bookmarks older than 7 days
};

// Get user settings
async function getSettings() {
  const result = await browser.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

// Save settings
async function saveSettings(settings) {
  await browser.storage.local.set({
    settings: { ...DEFAULT_SETTINGS, ...settings },
  });
}

// Get all bookmarks recursively, respecting excluded folders
async function getAllBookmarks(excludedFolderIds = []) {
  const tree = await browser.bookmarks.getTree();
  const bookmarks = [];

  function traverse(nodes, currentPath = "") {
    for (const node of nodes) {
      // Skip excluded folders and their children
      if (excludedFolderIds.includes(node.id)) {
        continue;
      }

      if (node.url) {
        // It's a bookmark
        bookmarks.push({
          id: node.id,
          title: node.title || "Untitled",
          url: node.url,
          dateAdded: node.dateAdded,
          path: currentPath,
        });
      }

      if (node.children) {
        const folderName = node.title || "";
        const newPath = currentPath
          ? `${currentPath} / ${folderName}`
          : folderName;
        traverse(node.children, newPath);
      }
    }
  }

  traverse(tree);
  return bookmarks;
}

// Get visit count for a URL
async function getVisitCount(url) {
  try {
    const visits = await browser.history.getVisits({ url });
    return visits.length;
  } catch (e) {
    return 0;
  }
}

// Get forgotten bookmarks (low visit count, old enough)
async function getForgottenBookmarks() {
  const settings = await getSettings();
  const bookmarks = await getAllBookmarks(settings.excludedFolders);

  const now = Date.now();
  const minAgeMs = settings.minAgeDays * 24 * 60 * 60 * 1000;

  // Filter by age and get visit counts
  const candidates = [];

  for (const bookmark of bookmarks) {
    // Skip if too new
    if (bookmark.dateAdded && now - bookmark.dateAdded < minAgeMs) {
      continue;
    }

    // Skip non-http(s) URLs
    if (
      !bookmark.url.startsWith("http://") &&
      !bookmark.url.startsWith("https://")
    ) {
      continue;
    }

    const visitCount = await getVisitCount(bookmark.url);

    if (visitCount <= settings.maxVisitCount) {
      // Check if dateAdded is valid (not corrupted/too old)
      const hasValidDate =
        bookmark.dateAdded && bookmark.dateAdded >= MIN_VALID_TIMESTAMP;

      candidates.push({
        ...bookmark,
        visitCount,
        daysSinceAdded: hasValidDate
          ? Math.floor((now - bookmark.dateAdded) / (24 * 60 * 60 * 1000))
          : null,
      });
    }
  }

  // Shuffle and pick random ones
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, settings.numBookmarks);
}

// Get all bookmark folders for settings UI
async function getBookmarkFolders() {
  const tree = await browser.bookmarks.getTree();
  const folders = [];

  function traverse(nodes, depth = 0) {
    for (const node of nodes) {
      if (node.children) {
        folders.push({
          id: node.id,
          title: node.title || "Root",
          depth,
        });
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(tree);
  return folders;
}

// Handle messages from popup/newtab/options
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "getForgottenBookmarks":
      return getForgottenBookmarks();

    case "getBookmarkFolders":
      return getBookmarkFolders();

    case "getSettings":
      return getSettings();

    case "saveSettings":
      return saveSettings(message.settings);

    case "deleteBookmark":
      return browser.bookmarks.remove(message.bookmarkId);

    default:
      return Promise.resolve(null);
  }
});
