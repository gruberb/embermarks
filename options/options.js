// Embermarks - Options Script

document.addEventListener("DOMContentLoaded", async () => {
  const numBookmarksInput = document.getElementById("numBookmarks");
  const maxVisitCountInput = document.getElementById("maxVisitCount");
  const minAgeDaysInput = document.getElementById("minAgeDays");
  const folderList = document.getElementById("folderList");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");

  // Load current settings
  const settings = await browser.runtime.sendMessage({ action: "getSettings" });

  numBookmarksInput.value = settings.numBookmarks;
  maxVisitCountInput.value = settings.maxVisitCount;
  minAgeDaysInput.value = settings.minAgeDays;

  // Load folder list
  const folders = await browser.runtime.sendMessage({
    action: "getBookmarkFolders",
  });

  // Clear loading text
  while (folderList.firstChild) {
    folderList.removeChild(folderList.firstChild);
  }

  for (const folder of folders) {
    const item = document.createElement("div");
    item.className = `folder-item folder-depth-${Math.min(folder.depth, 3)}`;

    const isExcluded = settings.excludedFolders.includes(folder.id);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `folder-${folder.id}`;
    checkbox.value = folder.id;
    checkbox.checked = isExcluded;

    const label = document.createElement("label");
    label.htmlFor = `folder-${folder.id}`;
    label.textContent = `📁 ${folder.title || "(unnamed)"}`;

    item.appendChild(checkbox);
    item.appendChild(label);
    folderList.appendChild(item);
  }

  // Save settings
  saveBtn.addEventListener("click", async () => {
    const excludedFolders = [];
    folderList.querySelectorAll("input:checked").forEach((checkbox) => {
      excludedFolders.push(checkbox.value);
    });

    const newSettings = {
      numBookmarks: parseInt(numBookmarksInput.value, 10),
      maxVisitCount: parseInt(maxVisitCountInput.value, 10),
      minAgeDays: parseInt(minAgeDaysInput.value, 10),
      excludedFolders,
    };

    await browser.runtime.sendMessage({
      action: "saveSettings",
      settings: newSettings,
    });

    // Show save confirmation
    saveStatus.classList.add("visible");
    setTimeout(() => {
      saveStatus.classList.remove("visible");
    }, 2000);
  });
});
