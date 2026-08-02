const LABELS = Object.freeze({
  zh: Object.freeze({
    surface: "指挥部",
    axis: "轴心国指挥部",
    allied: "英军指挥部",
    events: "事件",
    letters: "信件",
    unread: "未读",
    unreadCount: "未读 {count}",
    newItem: "新",
    close: "关闭指挥部",
    emptyEvents: "当前没有已解锁的事件报告。",
    emptyLetters: "当前没有已解锁的信件。",
    chooseEntry: "从左侧档案目录选择一份材料。",
    backToList: "返回档案目录",
    choices: "选择你的回应",
    reportStamp: "作战报告",
    briefingStamp: "战地简报",
  }),
  en: Object.freeze({
    surface: "Headquarters",
    axis: "Axis Headquarters",
    allied: "British Headquarters",
    events: "Events",
    letters: "Letters",
    unread: "Unread",
    unreadCount: "Unread {count}",
    newItem: "New",
    close: "Close headquarters",
    emptyEvents: "No event reports are unlocked yet.",
    emptyLetters: "No letters are unlocked yet.",
    chooseEntry: "Select a document from the archive list.",
    backToList: "Back to archive list",
    choices: "Choose your response",
    reportStamp: "Staff report",
    briefingStamp: "Operational briefing",
  }),
});

function normalizedLanguage(language) {
  return language === "en" ? "en" : "zh";
}

function localized(value, language, fallback = "") {
  if (typeof value === "string") return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? fallback;
}

function paragraphList(body) {
  if (Array.isArray(body)) return body.map(String).filter(Boolean);
  return body ? [String(body)] : [];
}

function summarize(body) {
  const text = paragraphList(body).join(" ").trim();
  if (text.length <= 64) return text;
  return `${text.slice(0, 61)}…`;
}

function presentMedia(media, language) {
  const displayPolicy = media.displayPolicy ?? "hidden";
  if (displayPolicy === "hidden") return null;
  return {
    assetId: media.assetId,
    src: media.src,
    alt: localized(media.altText, language),
    displayPolicy: "image_only",
    overlay: media.overlay ?? null,
    subject: media.subject ?? "",
  };
}

function presentEntry(entry, language) {
  const images = (entry.media ?? [])
    .map((media) => presentMedia(media, language))
    .filter(Boolean);
  const date = entry.document?.timelineLabel
    ? `${localized(entry.document.timelineLabel, language)} · ${entry.document.date ?? ""}`.trim()
    : entry.eyebrow ?? "";
  return {
    id: entry.id,
    title: entry.title,
    date,
    summary: summarize(entry.body),
    summaryDerivedFromBody: true,
    body: paragraphList(entry.body),
    unread: Boolean(entry.isNew),
    images,
    image: images[0] ?? null,
    impact: entry.impact,
  };
}

export function toHeadquartersSurfaceModel({ catalog, narrativeModel, language = "zh" } = {}) {
  if (!catalog?.headquarters || !narrativeModel?.headquarters) {
    throw new TypeError("headquarters presenter requires a catalog and narrative model");
  }
  const lang = normalizedLanguage(language);
  const labels = LABELS[lang];
  const sides = ["axis", "allied"].map((sideId) => {
    const definition = catalog.headquarters[sideId];
    const selected = narrativeModel.headquarters[sideId];
    return {
      id: sideId,
      label: labels[sideId],
      commander: {
        name: localized(definition.commander.name, lang),
        title: localized(definition.commander.role, lang),
        portraitSrc: definition.commander.portrait,
        portraitAlt: localized(definition.commander.portraitAlt, lang),
      },
      unreadCount: selected.unreadCount,
      emptyState: localized(definition.emptyState, lang),
      sections: {
        events: selected.sections.events.entries.map((entry) => presentEntry(entry, lang)),
        letters: selected.sections.letters.entries.map((entry) => presentEntry(entry, lang)),
      },
    };
  });
  return { labels: { ...labels }, sides };
}

export function toTurnBriefingModel({ narrativeModel, language = "zh" } = {}) {
  const pending = narrativeModel?.pendingBriefing;
  if (!pending) return null;
  const lang = normalizedLanguage(language);
  const labels = LABELS[lang];
  const firstImage = pending.media?.[0] ? presentMedia(pending.media[0], lang) : null;
  return {
    entryId: pending.id,
    blocking: true,
    side: pending.side,
    pending: false,
    eyebrow: pending.eyebrow ?? "",
    title: pending.title,
    body: paragraphList(pending.body),
    image: firstImage ? {
      assetId: firstImage.assetId,
      src: firstImage.src,
      alt: firstImage.alt,
      displayPolicy: firstImage.displayPolicy,
    } : null,
    stampLabel: labels.briefingStamp,
    choicesLabel: labels.choices,
    choices: pending.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
}
