// Embermarks - Background Script
// Handles bookmark analysis and forgotten bookmark detection

// Minimum valid timestamp (Jan 1, 2010) - older dates are likely corrupted imports
const MIN_VALID_TIMESTAMP = 1262304000000;

// Cache duration for "daily" refresh mode (24 hours in ms)
const DAILY_CACHE_DURATION = 24 * 60 * 60 * 1000;

const DEFAULT_SETTINGS = {
  excludedFolders: [],
  numBookmarks: 5,
  maxVisitCount: 2, // Consider "forgotten" if visited 2 or fewer times
  minAgeDays: 7, // Only show bookmarks older than 7 days
  notVisitedInDays: 0, // Consider "forgotten" if not visited in X days (0 = disabled)
  refreshBehavior: "always", // "always", "daily", or "manual"
};

// In-memory cache for bookmarks
let cachedBookmarks = null;
let cacheTimestamp = null;

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

// Get cached bookmarks if valid
async function getCachedBookmarks() {
  const result = await browser.storage.local.get([
    "cachedBookmarks",
    "cacheTimestamp",
  ]);
  return {
    bookmarks: result.cachedBookmarks || null,
    timestamp: result.cacheTimestamp || null,
  };
}

// Save bookmarks to cache
async function setCachedBookmarks(bookmarks) {
  await browser.storage.local.set({
    cachedBookmarks: bookmarks,
    cacheTimestamp: Date.now(),
  });
}

// Clear the cache
async function clearCache() {
  await browser.storage.local.remove(["cachedBookmarks", "cacheTimestamp"]);
  cachedBookmarks = null;
  cacheTimestamp = null;
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

// Get visit count and last visit time for a URL
async function getVisitInfo(url) {
  try {
    const visits = await browser.history.getVisits({ url });
    const lastVisitTime =
      visits.length > 0 ? Math.max(...visits.map((v) => v.visitTime)) : null;
    return {
      visitCount: visits.length,
      lastVisitTime: lastVisitTime,
    };
  } catch (e) {
    return { visitCount: 0, lastVisitTime: null };
  }
}

// Fetch fresh forgotten bookmarks
async function fetchFreshBookmarks() {
  const settings = await getSettings();
  const bookmarks = await getAllBookmarks(settings.excludedFolders);

  const now = Date.now();
  const minAgeMs = settings.minAgeDays * 24 * 60 * 60 * 1000;

  // Filter by age and get visit counts
  const candidates = [];
  const notVisitedInMs = settings.notVisitedInDays * 24 * 60 * 60 * 1000;

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

    const { visitCount, lastVisitTime } = await getVisitInfo(bookmark.url);

    // Check if bookmark qualifies as "forgotten"
    // Either: low visit count OR hasn't been visited in X days (if enabled)
    const isLowVisitCount = visitCount <= settings.maxVisitCount;
    const isStale =
      settings.notVisitedInDays > 0 &&
      (lastVisitTime === null || now - lastVisitTime > notVisitedInMs);

    if (isLowVisitCount || isStale) {
      // Check if dateAdded is valid (not corrupted/too old)
      const hasValidDate =
        bookmark.dateAdded && bookmark.dateAdded >= MIN_VALID_TIMESTAMP;

      const daysSinceLastVisit = lastVisitTime
        ? Math.floor((now - lastVisitTime) / (24 * 60 * 60 * 1000))
        : null;

      candidates.push({
        ...bookmark,
        visitCount,
        lastVisitTime,
        daysSinceLastVisit,
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

// Get forgotten bookmarks (with caching logic)
async function getForgottenBookmarks(forceRefresh = false) {
  const settings = await getSettings();
  const { bookmarks: cached, timestamp } = await getCachedBookmarks();

  // Determine if we should use cache
  if (!forceRefresh && cached && timestamp) {
    const now = Date.now();
    const cacheAge = now - timestamp;

    if (settings.refreshBehavior === "manual") {
      // Always use cache in manual mode (until explicit refresh)
      return cached;
    }

    if (
      settings.refreshBehavior === "daily" &&
      cacheAge < DAILY_CACHE_DURATION
    ) {
      // Use cache if less than 24 hours old
      return cached;
    }
  }

  // Fetch fresh bookmarks
  const freshBookmarks = await fetchFreshBookmarks();

  // Cache the results (for daily and manual modes)
  if (settings.refreshBehavior !== "always") {
    await setCachedBookmarks(freshBookmarks);
  }

  return freshBookmarks;
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

// Handle messages from popup/options
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "getForgottenBookmarks":
      return getForgottenBookmarks(message.forceRefresh || false);

    case "clearCache":
      return clearCache();

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
