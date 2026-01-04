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

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Create a bookmark card element
function createBookmarkCard(bookmark) {
  const card = document.createElement("a");
  card.className = "bookmark-card";
  card.href = bookmark.url;
  card.target = "_blank";
  card.rel = "noopener";

  const faviconUrl = getFaviconUrl(bookmark.url);

  card.innerHTML = `
    <div class="bookmark-favicon">
      ${faviconUrl ? `<img src="${faviconUrl}" alt="">` : "🔖"}
    </div>
    <div class="bookmark-info">
      <div class="bookmark-title" title="${escapeHtml(bookmark.title)}">${escapeHtml(bookmark.title)}</div>
      <div class="bookmark-meta">
        ${bookmark.visitCount} visit${bookmark.visitCount !== 1 ? "s" : ""} · Added ${formatDaysAgo(bookmark.daysSinceAdded)}
      </div>
      ${bookmark.path ? `<div class="bookmark-folder">${escapeHtml(bookmark.path)}</div>` : ""}
    </div>
  `;

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

  container.innerHTML = `
    <div class="empty-state">
      <div class="icon">${msg.icon}</div>
      <h2>${msg.title}</h2>
      <p>${msg.text}</p>
    </div>
  `;
}

// Show loading state
function showLoading(container) {
  container.innerHTML = '<div class="loading"></div>';
}

// Load and display bookmarks
async function loadBookmarks(container) {
  showLoading(container);

  try {
    const bookmarks = await browser.runtime.sendMessage({
      action: "getForgottenBookmarks",
    });

    container.innerHTML = "";

    if (!bookmarks || bookmarks.length === 0) {
      showEmptyState(container, "none");
      return;
    }

    for (const bookmark of bookmarks) {
      container.appendChild(createBookmarkCard(bookmark));
    }
  } catch (error) {
    console.error("Failed to load bookmarks:", error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">!</div>
        <h2>Oops</h2>
        <p>Failed to load bookmarks</p>
      </div>
    `;
  }
}
