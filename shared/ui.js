// Embermarks - Shared UI Logic

// Get favicon URL for a bookmark
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
}

// Format days ago
function formatDaysAgo(days) {
  if (days === null) return "Unknown";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Create a bookmark card element
function createBookmarkCard(bookmark) {
  const card = document.createElement("a");
  card.className = "bookmark-card";
  card.href = bookmark.url;
  card.target = "_blank";
  card.rel = "noopener";

  // Favicon container
  const favicon = document.createElement("div");
  favicon.className = "bookmark-favicon";

  const faviconUrl = getFaviconUrl(bookmark.url);
  if (faviconUrl) {
    const img = document.createElement("img");
    img.src = faviconUrl;
    img.alt = "";
    favicon.appendChild(img);
  } else {
    favicon.textContent = "🔖";
  }

  // Info container
  const info = document.createElement("div");
  info.className = "bookmark-info";

  const title = document.createElement("div");
  title.className = "bookmark-title";
  title.title = bookmark.title;
  title.textContent = bookmark.title;

  const meta = document.createElement("div");
  meta.className = "bookmark-meta";
  const visitText =
    bookmark.visitCount === 1 ? "1 visit" : `${bookmark.visitCount} visits`;
  meta.textContent = `${visitText} · Added ${formatDaysAgo(bookmark.daysSinceAdded)}`;

  info.appendChild(title);
  info.appendChild(meta);

  if (bookmark.path) {
    const folder = document.createElement("div");
    folder.className = "bookmark-folder";
    folder.textContent = bookmark.path;
    info.appendChild(folder);
  }

  card.appendChild(favicon);
  card.appendChild(info);

  return card;
}

// Show empty state
function showEmptyState(container, reason = "none") {
  const messages = {
    none: {
      icon: "✓",
      title: "No forgotten bookmarks",
      text: "You're on top of things!",
    },
    allDismissed: {
      icon: "✓",
      title: "All caught up",
      text: "Refresh to see more",
    },
  };

  const msg = messages[reason] || messages.none;

  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "icon";
  icon.textContent = msg.icon;

  const heading = document.createElement("h2");
  heading.textContent = msg.title;

  const paragraph = document.createElement("p");
  paragraph.textContent = msg.text;

  emptyState.appendChild(icon);
  emptyState.appendChild(heading);
  emptyState.appendChild(paragraph);

  container.appendChild(emptyState);
}

// Show loading state
function showLoading(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const loading = document.createElement("div");
  loading.className = "loading";
  container.appendChild(loading);
}

// Show error state
function showError(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "icon";
  icon.textContent = "!";

  const heading = document.createElement("h2");
  heading.textContent = "Oops";

  const paragraph = document.createElement("p");
  paragraph.textContent = "Failed to load bookmarks";

  emptyState.appendChild(icon);
  emptyState.appendChild(heading);
  emptyState.appendChild(paragraph);

  container.appendChild(emptyState);
}
