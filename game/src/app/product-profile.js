(function installElAlameinProductProfile(root) {
  "use strict";

  const profiles = Object.freeze({
    foundation: freezeProfile("foundation", false, false, false, "zizi-el-alamein-foundation-map-zoom-v3"),
    alpha: freezeProfile("alpha", true, false, false, "zizi-el-alamein-alpha-map-zoom-v3"),
    online: freezeProfile("online", false, true, false, "zizi-el-alamein-online-map-zoom-v3"),
    "hq-events-preview": freezeProfile(
      "hq-events-preview",
      false,
      false,
      true,
      "zizi-el-alamein-hq-events-preview-map-zoom-v3",
      "zizi-el-alamein-hq-events-preview",
    ),
  });
  const configuredId = normalizeProfileId(root.document?.currentScript?.dataset?.profile);
  const localOverride = isLocalHost(root.location?.hostname)
    ? normalizeProfileId(new URLSearchParams(root.location?.search || "").get("profile"))
    : null;
  const current = profiles[localOverride || configuredId || "foundation"];

  if (root.document?.documentElement?.dataset) {
    root.document.documentElement.dataset.productProfile = current.id;
  }
  root.ElAlameinProductProfile = Object.freeze({
    ids: Object.freeze(Object.keys(profiles)),
    profiles,
    current,
    resolve(value) {
      return profiles[normalizeProfileId(value) || "foundation"];
    },
  });
  root.ElAlameinProductStorage = Object.freeze({
    key(legacyKey) {
      const key = String(legacyKey || "").trim();
      if (!key) throw new TypeError("A legacy storage key is required");
      const prefix = current.storage.gameStoragePrefix;
      if (!prefix) return key;
      return `${prefix}-${key.replace(/^zizi-el-alamein-/, "")}`;
    },
  });

  function freezeProfile(id, alphaRuntime, onlineFriendMatch, headquartersEvents, mapZoomStorageKey, gameStoragePrefix = null) {
    return Object.freeze({
      id,
      features: Object.freeze({
        scriptedAi: true,
        hotseat: true,
        trainingCapture: true,
        alphaRuntime,
        onlineFriendMatch,
        headquartersEvents,
      }),
      storage: Object.freeze({ mapZoomStorageKey, gameStoragePrefix }),
    });
  }

  function normalizeProfileId(value) {
    const id = String(value || "").trim().toLowerCase();
    return Object.hasOwn(profiles, id) ? id : null;
  }

  function isLocalHost(hostname) {
    return ["127.0.0.1", "localhost", "::1"].includes(String(hostname || "").toLowerCase());
  }
})(globalThis);
