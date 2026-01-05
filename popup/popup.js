// Embermarks - Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("bookmarks");
  const refreshBtn = document.getElementById("refresh");

  // Load bookmarks (respects cache settings)
  await loadBookmarks(container, false);

  // Refresh button always forces a fresh load
  refreshBtn.addEventListener("click", async () => {
    await loadBookmarks(container, true);
  });
});

// Load and display bookmarks
async function loadBookmarks(container, forceRefresh) {
  showLoading(container);

  try {
    const bookmarks = await browser.runtime.sendMessage({
      action: "getForgottenBookmarks",
      forceRefresh: forceRefresh,
    });

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!bookmarks || bookmarks.length === 0) {
      showEmptyState(container, "none");
      return;
    }

    for (const bookmark of bookmarks) {
      container.appendChild(createBookmarkCard(bookmark));
    }
  } catch (error) {
    console.error("Failed to load bookmarks:", error);
    showError(container);
  }
}
