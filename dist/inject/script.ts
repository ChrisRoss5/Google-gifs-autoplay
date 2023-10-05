declare const chrome: any;

const regexFilter = /client=img|tbm=isch|VisualFrontendUi/;
const isImageSearch = regexFilter.test(location.href);
const mouseEvent = new MouseEvent("mousedown", {
  bubbles: true,
});

if (isImageSearch) {
  log("Image search detected.");
  chrome.storage.sync.get("enabled", ({ enabled }: { enabled?: boolean }) => {
    if (enabled === undefined) {
      chrome.storage.sync.set({ enabled: true });
      enabled = true;
    }
    log("Extension " + (enabled ? "enabled." : "disabled."));
    if (enabled) main();
  });

  chrome.runtime.onMessage.addListener(({ enabled }: { enabled: boolean }) => {
    if (enabled) main();
    else location.reload();
  });
}

function main() {
  const searchResultsContainer = document.querySelector(".islrc");
  if (!searchResultsContainer)
    return log("Search results container not found!", true);
  const sideResultsContainer = document.querySelector("#islsp");

  addGifsButton();
  updateSearchResults(searchResultsContainer);

  const resultsObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations)
      for (const child of mutation.addedNodes)
        if (child instanceof HTMLElement && child.classList.contains("isnpr"))
          updateSearchResults(child);
  });

  const sideResultsObserver = new MutationObserver(() => {
    const lists = sideResultsContainer!.querySelectorAll("[role=list]");
    lists.forEach(updateSearchResults);
  });

  resultsObserver.observe(searchResultsContainer, { childList: true });
  if (sideResultsContainer)
    sideResultsObserver.observe(sideResultsContainer, { childList: true, subtree: true });
  else log("Side results container not found!", true);
}

function updateSearchResults(searchResultsContainer: Element) {
  for (const item of searchResultsContainer.children) {
    if (item.classList.contains("isnpr")) {
      updateSearchResults(item);
      continue;
    }
    const a = item.querySelector("a");
    const img = a?.querySelector("img");
    if (!a || !img) continue;

    const hrefObserver = new MutationObserver(() => {
      const decodedUrl = decodeURIComponent(a.href);
      const startIdx = decodedUrl.indexOf("=http");
      let endIdx = decodedUrl.indexOf(".gif&");
      if (endIdx == -1) endIdx = decodedUrl.lastIndexOf(".gif");
      const gifSrc = decodedUrl.slice(startIdx + 1, endIdx + 4);
      if (!gifSrc) return;
      hrefObserver.disconnect();
      const imgGif = document.createElement("img");
      imgGif.style.setProperty("position", "absolute", "important");
      imgGif.style.setProperty("top", "0", "important");
      imgGif.style.setProperty("left", "0", "important");
      imgGif.style.setProperty("width", "100%", "important");
      imgGif.style.setProperty("height", "100%", "important");
      imgGif.style.setProperty("pointer-events", "none", "important");
      imgGif.loading = "lazy";
      imgGif.src = gifSrc;
      imgGif.onerror = () => imgGif.remove();
      img.insertAdjacentElement("afterend", imgGif);
      img.loading = "lazy";
    });

    hrefObserver.observe(a, { attributeFilter: ["href"] });

    a.dispatchEvent(mouseEvent);
  }
}

async function addGifsButton() {
  const gifsParam = "&tbs=itp:animated";
  if (location.href.includes(gifsParam)) return;

  const activeItem = document.querySelector("[aria-current=page]");
  const nextItem = activeItem?.nextElementSibling;
  if (!nextItem) return log("Next item not found!", true);

  const clone = nextItem.cloneNode(true) as HTMLAnchorElement;
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("images/original.png");
  img.style.height = "1rem";
  clone.textContent = "";
  clone.appendChild(img);
  clone.href = location.href + gifsParam;
  activeItem.insertAdjacentElement("afterend", clone);
}

function log(message: string, isError = false) {
  message = "%c[Gifs autoplay for Google™]%c " + message;
  if (isError) message += " Please report this issue.";
  console.log(message, "color: #C55A11", "color: initial");
}
