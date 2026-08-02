let overlaySequence = 0;

function makeElement(documentRef, tagName, className, text = "") {
  const element = documentRef.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function localizedParagraphs(body) {
  if (Array.isArray(body)) return body.map(String).filter(Boolean);
  return body ? [String(body)] : [];
}

function briefingEntryId(model) {
  return String(model?.entryId ?? model?.id ?? "").trim();
}

export function createTurnBriefingOverlay({
  root,
  onDecision,
  documentRef = globalThis.document,
} = {}) {
  if (!root || typeof root.append !== "function") {
    throw new TypeError("turn briefing overlay root must be a DOM element");
  }
  if (typeof onDecision !== "function") {
    throw new TypeError("turn briefing overlay requires an onDecision callback");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new TypeError("turn briefing overlay requires a document");
  }

  const instanceId = ++overlaySequence;
  const titleId = `turn-briefing-title-${instanceId}`;
  const dialog = makeElement(documentRef, "dialog", "turn-briefing-overlay");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", titleId);
  dialog.dataset.state = "closed";
  dialog.dataset.blocking = "true";

  const shell = makeElement(documentRef, "article", "turn-briefing-overlay__shell");
  const visual = makeElement(documentRef, "figure", "turn-briefing-overlay__visual");
  const image = makeElement(documentRef, "img", "turn-briefing-overlay__image");
  visual.append(image);

  const report = makeElement(documentRef, "section", "turn-briefing-overlay__report");
  const stamp = makeElement(documentRef, "p", "turn-briefing-overlay__stamp");
  const header = makeElement(documentRef, "header", "turn-briefing-overlay__header");
  const eyebrow = makeElement(documentRef, "p", "turn-briefing-overlay__eyebrow");
  const title = makeElement(documentRef, "h2", "turn-briefing-overlay__title");
  title.id = titleId;
  header.append(eyebrow, title);

  const body = makeElement(documentRef, "div", "turn-briefing-overlay__body");
  const decisions = makeElement(documentRef, "div", "turn-briefing-overlay__decisions");
  decisions.setAttribute("role", "group");
  report.append(stamp, header, body, decisions);
  shell.append(visual, report);
  dialog.append(shell);
  root.append(dialog);

  let currentModel = null;
  let previousFocus = null;
  let destroyed = false;
  let choiceButtons = [];
  let choiceBindings = [];

  function detachChoiceListeners() {
    for (const { button, listener } of choiceBindings) {
      button.removeEventListener("click", listener);
    }
    choiceBindings = [];
  }

  function focusFirstChoice() {
    const firstEnabled = choiceButtons.find((button) => !button.disabled);
    if (firstEnabled) firstEnabled.focus();
    else if (typeof dialog.focus === "function") dialog.focus();
  }

  function render(model) {
    const entryId = briefingEntryId(model);
    if (!entryId) throw new TypeError("turn briefing model requires an entryId");

    const focusedChoice = choiceButtons.includes(documentRef.activeElement)
      ? documentRef.activeElement.dataset.choiceId
      : null;

    currentModel = model;
    dialog.dataset.entryId = entryId;
    dialog.dataset.blocking = String(model.blocking !== false);
    dialog.dataset.side = String(model.side || "neutral");
    dialog.setAttribute("aria-busy", String(Boolean(model.pending)));
    stamp.textContent = String(model.stampLabel || "");
    eyebrow.textContent = String(model.eyebrow || "");
    title.textContent = String(model.title || "");

    const paragraphs = localizedParagraphs(model.body).map((paragraph) => (
      makeElement(documentRef, "p", "turn-briefing-overlay__paragraph", paragraph)
    ));
    body.replaceChildren(...paragraphs);

    const imageModel = model.image || null;
    visual.hidden = !imageModel?.src;
    image.src = imageModel?.src ? String(imageModel.src) : "";
    image.alt = imageModel?.alt ? String(imageModel.alt) : "";

    decisions.setAttribute("aria-label", String(model.choicesLabel || model.title || ""));
    detachChoiceListeners();
    choiceButtons = (Array.isArray(model.choices) ? model.choices : []).map((choice) => {
      const choiceId = String(choice?.id ?? "").trim();
      if (!choiceId) throw new TypeError(`turn briefing ${entryId} contains a choice without an id`);
      const label = String(choice.label || "");
      const button = makeElement(
        documentRef,
        "button",
        "turn-briefing-overlay__decision ui-touch-target",
        label,
      );
      button.type = "button";
      button.dataset.choiceId = choiceId;
      button.disabled = Boolean(choice.disabled || model.pending);
      button.setAttribute("aria-label", label);
      if (choice.description) {
        button.setAttribute("aria-description", String(choice.description));
        button.setAttribute("title", String(choice.description));
      }
      const listener = () => onDecision({ entryId, choiceId });
      button.addEventListener("click", listener);
      choiceBindings.push({ button, listener });
      return button;
    });
    decisions.replaceChildren(...choiceButtons);

    if (dialog.open && focusedChoice) {
      choiceButtons.find((button) => button.dataset.choiceId === focusedChoice)?.focus();
    }
  }

  function restorePreviousFocus() {
    const target = previousFocus;
    previousFocus = null;
    if (target && target !== dialog && typeof target.focus === "function") target.focus();
  }

  function handleClose() {
    dialog.dataset.state = "closed";
    restorePreviousFocus();
  }

  function handleCancel(event) {
    event.preventDefault();
    if (currentModel?.blocking !== false) return;
    hide();
  }

  dialog.addEventListener("cancel", handleCancel);
  dialog.addEventListener("close", handleClose);

  function show(model) {
    if (destroyed) throw new Error("turn briefing overlay has been destroyed");
    const wasOpen = Boolean(dialog.open);
    if (!wasOpen) previousFocus = documentRef.activeElement;
    const previousEntryId = briefingEntryId(currentModel);
    render(model);
    if (!wasOpen) {
      dialog.showModal();
      dialog.dataset.state = "open";
      focusFirstChoice();
    } else if (previousEntryId !== briefingEntryId(model)) {
      focusFirstChoice();
    }
  }

  function update(model) {
    if (destroyed) throw new Error("turn briefing overlay has been destroyed");
    const previousEntryId = briefingEntryId(currentModel);
    render(model);
    if (dialog.open && previousEntryId !== briefingEntryId(model)) focusFirstChoice();
  }

  function hide() {
    if (destroyed) return;
    if (dialog.open) dialog.close();
    else handleClose();
  }

  return Object.freeze({
    element: dialog,
    show,
    update,
    hide,
    isOpen: () => !destroyed && Boolean(dialog.open),
    destroy() {
      if (destroyed) return;
      hide();
      destroyed = true;
      detachChoiceListeners();
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      if (dialog.parentNode === root) dialog.remove();
    },
  });
}
