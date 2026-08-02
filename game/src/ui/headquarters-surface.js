const SECTIONS = Object.freeze(["events", "letters"]);

let surfaceSequence = 0;

function makeElement(documentRef, tagName, className, text = "") {
  const element = documentRef.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function entriesFor(side, section) {
  const entries = side?.sections?.[section];
  return Array.isArray(entries) ? entries : [];
}

function findSide(model, sideId) {
  return model?.sides?.find((side) => side.id === sideId) || null;
}

function replaceTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    String(template || ""),
  );
}

function unreadText(labels, count) {
  if (labels.unreadCount) return replaceTemplate(labels.unreadCount, { count });
  return `${labels.unread || "Unread"} ${count}`;
}

function isElementWithin(element, ancestor) {
  let current = element;
  while (current) {
    if (current === ancestor) return true;
    current = current.parentNode;
  }
  return false;
}

export function createHeadquartersSurface({
  root,
  onCommand,
  documentRef = globalThis.document,
} = {}) {
  if (!root || typeof root.replaceChildren !== "function") {
    throw new TypeError("headquarters surface root must be a DOM element");
  }
  if (typeof onCommand !== "function") {
    throw new TypeError("headquarters surface requires an onCommand callback");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new TypeError("headquarters surface requires a document");
  }

  const instanceId = `headquarters-${++surfaceSequence}`;
  let model = { labels: {}, sides: [] };
  let destroyed = false;
  let activeSideId = null;
  let opener = null;
  let detailFocusTarget = null;

  const activeSectionBySide = new Map();
  const selectedEntryByScope = new Map();
  const launchersBySide = new Map();
  const tabButtons = new Map();
  const entryButtons = new Map();

  const surface = makeElement(documentRef, "section", "headquarters-surface");
  const launcherList = makeElement(documentRef, "div", "headquarters-launchers");
  const dialog = makeElement(documentRef, "dialog", "headquarters-dialog");
  dialog.hidden = true;
  dialog.setAttribute("aria-modal", "true");

  const shell = makeElement(documentRef, "div", "headquarters-dialog-shell");
  const header = makeElement(documentRef, "header", "headquarters-dialog-header");
  const commanderPortrait = makeElement(documentRef, "img", "headquarters-commander-portrait");
  const identity = makeElement(documentRef, "div", "headquarters-commander-identity");
  const heading = makeElement(documentRef, "h2", "headquarters-commander-name");
  heading.id = `${instanceId}-title`;
  heading.setAttribute("tabindex", "-1");
  const commanderTitle = makeElement(documentRef, "p", "headquarters-commander-title");
  identity.append(heading, commanderTitle);
  const closeButton = makeElement(documentRef, "button", "headquarters-close");
  closeButton.type = "button";
  header.append(commanderPortrait, identity, closeButton);

  const tabs = makeElement(documentRef, "div", "headquarters-tabs");
  tabs.setAttribute("role", "tablist");
  const workspace = makeElement(documentRef, "div", "headquarters-workspace");
  const catalog = makeElement(documentRef, "nav", "headquarters-catalog");
  const entryList = makeElement(documentRef, "div", "headquarters-entry-list");
  entryList.id = `${instanceId}-catalog`;
  entryList.setAttribute("role", "listbox");
  catalog.append(entryList);
  const detail = makeElement(documentRef, "section", "headquarters-detail");
  detail.id = `${instanceId}-detail`;
  detail.setAttribute("role", "tabpanel");
  detail.setAttribute("aria-live", "polite");
  workspace.append(catalog, detail);
  shell.append(header, tabs, workspace);
  dialog.append(shell);
  surface.append(launcherList, dialog);
  root.replaceChildren(surface);

  function currentSide() {
    return findSide(model, activeSideId);
  }

  function currentSection() {
    return activeSectionBySide.get(activeSideId) || "events";
  }

  function scopeKey(section = currentSection()) {
    return `${activeSideId || "none"}:${section}`;
  }

  function selectedEntryId(section = currentSection()) {
    return selectedEntryByScope.get(scopeKey(section)) || null;
  }

  function captureFocus() {
    const activeElement = documentRef.activeElement;
    if (!activeElement || !isElementWithin(activeElement, surface)) return null;
    if (activeElement.dataset?.detailEntryId) {
      return { kind: "detail", id: activeElement.dataset.detailEntryId };
    }
    if (activeElement.dataset?.section && activeElement.className.includes("headquarters-tab")) {
      return { kind: "tab", id: activeElement.dataset.section };
    }
    if (activeElement.dataset?.entryId) return { kind: "entry", id: activeElement.dataset.entryId };
    return null;
  }

  function restoreCapturedFocus(captured) {
    if (captured?.kind === "tab") tabButtons.get(captured.id)?.focus();
    if (captured?.kind === "entry") entryButtons.get(captured.id)?.focus();
    if (captured?.kind === "detail" && detailFocusTarget?.dataset.detailEntryId === captured.id) {
      detailFocusTarget.focus();
    }
  }

  function syncLaunchers() {
    const activeIds = new Set(model.sides.map((side) => side.id));
    for (const sideId of launchersBySide.keys()) {
      if (!activeIds.has(sideId)) launchersBySide.delete(sideId);
    }

    const orderedLaunchers = model.sides.map((side) => {
      let button = launchersBySide.get(side.id);
      if (!button) {
        button = makeElement(documentRef, "button", "headquarters-launcher");
        button.type = "button";
        button.dataset.side = side.id;
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", () => openSide(button.dataset.side, button));
        launchersBySide.set(side.id, button);
      }

      const portrait = makeElement(documentRef, "img", "headquarters-launcher-portrait");
      portrait.src = side.commander?.portraitSrc || "";
      portrait.alt = side.commander?.portraitAlt || "";
      const copy = makeElement(documentRef, "span", "headquarters-launcher-copy");
      const label = makeElement(documentRef, "span", "headquarters-launcher-label", side.label || "");
      const commander = makeElement(documentRef, "span", "headquarters-launcher-commander", side.commander?.name || "");
      const unread = makeElement(
        documentRef,
        "span",
        "headquarters-launcher-unread",
        unreadText(model.labels, Number(side.unreadCount) || 0),
      );
      copy.append(label, commander, unread);
      button.replaceChildren(portrait, copy);
      button.setAttribute(
        "aria-label",
        `${side.label || side.commander?.name || ""}; ${unreadText(model.labels, Number(side.unreadCount) || 0)}`,
      );
      button.setAttribute("aria-controls", dialog.id || `${instanceId}-dialog`);
      return button;
    });

    launcherList.replaceChildren(...orderedLaunchers);
  }

  function renderIdentity(side) {
    dialog.dataset.side = side.id;
    dialog.setAttribute("aria-labelledby", heading.id);
    commanderPortrait.src = side.commander?.portraitSrc || "";
    commanderPortrait.alt = side.commander?.portraitAlt || "";
    heading.textContent = side.commander?.name || side.label || "";
    commanderTitle.textContent = side.commander?.title || "";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", model.labels.close || "Close");
    tabs.setAttribute("aria-label", side.label || model.labels.surface || "Headquarters");
  }

  function chooseTab(section, { focus = false } = {}) {
    if (!SECTIONS.includes(section) || !activeSideId) return;
    activeSectionBySide.set(activeSideId, section);
    dialog.dataset.mobileView = "list";
    renderTabsAndContent();
    if (focus) tabButtons.get(section)?.focus();
  }

  function moveTabFocus(section, key) {
    const index = SECTIONS.indexOf(section);
    let nextIndex = null;
    if (key === "ArrowRight") nextIndex = (index + 1) % SECTIONS.length;
    if (key === "ArrowLeft") nextIndex = (index - 1 + SECTIONS.length) % SECTIONS.length;
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = SECTIONS.length - 1;
    if (nextIndex === null) return false;
    chooseTab(SECTIONS[nextIndex], { focus: true });
    return true;
  }

  function renderTabs() {
    tabButtons.clear();
    const section = currentSection();
    const buttons = SECTIONS.map((sectionId) => {
      const button = makeElement(
        documentRef,
        "button",
        "headquarters-tab",
        model.labels[sectionId] || sectionId,
      );
      button.type = "button";
      button.id = `${instanceId}-${activeSideId}-${sectionId}-tab`;
      button.dataset.section = sectionId;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(sectionId === section));
      button.setAttribute("aria-controls", detail.id);
      button.setAttribute("tabindex", sectionId === section ? "0" : "-1");
      button.addEventListener("click", () => chooseTab(sectionId));
      button.addEventListener("keydown", (event) => {
        if (moveTabFocus(sectionId, event.key)) event.preventDefault();
      });
      tabButtons.set(sectionId, button);
      return button;
    });
    tabs.replaceChildren(...buttons);
    detail.setAttribute("aria-labelledby", tabButtons.get(section)?.id || "");
  }

  function focusEntryAt(entries, index) {
    const boundedIndex = Math.max(0, Math.min(entries.length - 1, index));
    entryButtons.get(entries[boundedIndex]?.id)?.focus();
  }

  function handleEntryKey(entries, index, event) {
    let nextIndex = null;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % entries.length;
    if (event.key === "ArrowUp") nextIndex = (index - 1 + entries.length) % entries.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = entries.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    focusEntryAt(entries, nextIndex);
  }

  function updateEntrySelection() {
    const selectedId = selectedEntryId();
    for (const [entryId, button] of entryButtons) {
      const selected = entryId === selectedId;
      button.setAttribute("aria-selected", String(selected));
      if (selected) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
  }

  function openEntry(entry) {
    selectedEntryByScope.set(scopeKey(), entry.id);
    dialog.dataset.mobileView = "detail";
    updateEntrySelection();
    renderDocument();
    detailFocusTarget?.focus();
    onCommand({ type: "ENTRY_OPENED", entryId: entry.id });
  }

  function renderEntryList() {
    entryButtons.clear();
    const side = currentSide();
    const section = currentSection();
    const entries = entriesFor(side, section);
    entryList.setAttribute("aria-label", `${side?.label || ""} ${model.labels[section] || section}`.trim());

    if (!entries.length) {
      const emptyLabel = section === "letters" ? model.labels.emptyLetters : model.labels.emptyEvents;
      const empty = makeElement(documentRef, "p", "headquarters-empty", emptyLabel || "");
      entryList.replaceChildren(empty);
      return;
    }

    const buttons = entries.map((entry, index) => {
      const button = makeElement(documentRef, "button", "headquarters-entry");
      button.type = "button";
      button.dataset.entryId = entry.id;
      button.setAttribute("role", "option");
      const title = makeElement(documentRef, "span", "headquarters-entry-title", entry.title || "");
      const meta = makeElement(documentRef, "span", "headquarters-entry-meta", entry.date || "");
      const summary = makeElement(documentRef, "span", "headquarters-entry-summary", entry.summary || "");
      const children = [title, meta, summary];
      if (entry.unread) {
        const marker = makeElement(documentRef, "span", "headquarters-entry-new", model.labels.newItem || "New");
        marker.setAttribute("aria-label", model.labels.newItem || "New");
        children.push(marker);
      }
      button.replaceChildren(...children);
      button.addEventListener("click", () => openEntry(entry));
      button.addEventListener("keydown", (event) => handleEntryKey(entries, index, event));
      entryButtons.set(entry.id, button);
      return button;
    });
    entryList.replaceChildren(...buttons);
    updateEntrySelection();
  }

  function appendOptionalText(parent, className, text, tagName = "p") {
    if (!text) return;
    parent.append(makeElement(documentRef, tagName, className, text));
  }

  function renderDocument() {
    const side = currentSide();
    const section = currentSection();
    const selectedId = selectedEntryId(section);
    const entry = entriesFor(side, section).find((candidate) => candidate.id === selectedId) || null;
    if (!entry && selectedId) selectedEntryByScope.delete(scopeKey(section));

    if (!entry) {
      detailFocusTarget = null;
      const prompt = makeElement(documentRef, "p", "headquarters-document-prompt", model.labels.chooseEntry || "");
      detail.replaceChildren(prompt);
      return;
    }

    const documentStyle = section === "letters" ? "letter" : "report";
    const article = makeElement(
      documentRef,
      "article",
      `headquarters-document headquarters-document--${documentStyle}`,
    );
    article.dataset.documentStyle = documentStyle;
    article.dataset.entryId = entry.id;
    if (documentStyle === "report") {
      article.append(makeElement(
        documentRef,
        "span",
        "headquarters-document-stamp",
        model.labels.reportStamp || "",
      ));
    }
    const title = makeElement(documentRef, "h3", "headquarters-document-title", entry.title || "");
    title.dataset.detailEntryId = entry.id;
    title.setAttribute("tabindex", "-1");
    detailFocusTarget = title;
    article.append(title);
    appendOptionalText(article, "headquarters-document-date", entry.date);
    if (!entry.summaryDerivedFromBody) {
      appendOptionalText(article, "headquarters-document-summary", entry.summary);
    }
    for (const paragraph of Array.isArray(entry.body) ? entry.body : []) {
      appendOptionalText(article, "headquarters-document-paragraph", paragraph);
    }

    const images = Array.isArray(entry.images) && entry.images.length
      ? entry.images
      : entry.image?.src
        ? [entry.image]
        : [];
    for (const imageModel of images) {
      const figure = makeElement(documentRef, "figure", "headquarters-document-figure");
      figure.dataset.overlay = imageModel.overlay || "none";
      const image = makeElement(documentRef, "img", "headquarters-document-image");
      image.src = imageModel.src;
      image.alt = imageModel.alt || "";
      figure.append(image);
      article.append(figure);
    }

    const backButton = makeElement(
      documentRef,
      "button",
      "headquarters-back",
      model.labels.backToList || "Back",
    );
    backButton.type = "button";
    backButton.addEventListener("click", () => {
      dialog.dataset.mobileView = "list";
      entryButtons.get(entry.id)?.focus();
    });
    detail.replaceChildren(backButton, article);
  }

  function renderTabsAndContent() {
    renderTabs();
    renderEntryList();
    renderDocument();
  }

  function renderDialog() {
    const side = currentSide();
    if (!side) return;
    renderIdentity(side);
    renderTabsAndContent();
  }

  function restoreOpenerFocus() {
    opener?.focus?.();
  }

  function closeSurface() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else {
      dialog.hidden = true;
      dialog.removeAttribute("open");
      restoreOpenerFocus();
    }
  }

  function openSide(sideId, launcher) {
    if (destroyed || !findSide(model, sideId)) return;
    activeSideId = sideId;
    opener = launcher;
    if (!activeSectionBySide.has(sideId)) activeSectionBySide.set(sideId, "events");
    dialog.dataset.mobileView = selectedEntryId() ? "detail" : "list";
    renderDialog();
    dialog.hidden = false;
    if (!dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    else {
      dialog.hidden = false;
      dialog.setAttribute("open", "");
    }
    heading.focus?.();
  }

  closeButton.addEventListener("click", closeSurface);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSurface();
  });
  dialog.addEventListener("close", restoreOpenerFocus);

  return Object.freeze({
    update(nextModel) {
      if (destroyed) return;
      if (!nextModel || typeof nextModel !== "object" || !Array.isArray(nextModel.sides)) {
        throw new TypeError("headquarters surface model must provide a sides array");
      }
      const capturedFocus = captureFocus();
      model = {
        ...nextModel,
        labels: nextModel.labels || {},
        sides: nextModel.sides,
      };
      surface.setAttribute("aria-label", model.labels.surface || "Headquarters");
      dialog.id = `${instanceId}-dialog`;
      syncLaunchers();
      if (activeSideId && !findSide(model, activeSideId)) {
        closeSurface();
        activeSideId = null;
      } else if (activeSideId) {
        renderDialog();
        restoreCapturedFocus(capturedFocus);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.replaceChildren();
    },
  });
}
