// Embermarks - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('bookmarks');
  const refreshBtn = document.getElementById('refresh');
  
  // Load bookmarks
  await loadBookmarks(container);
  
  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    await loadBookmarks(container);
  });
});
