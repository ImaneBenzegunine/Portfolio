// Runs before styles paint; stays external to preserve the no-inline-script CSP.
(function () {
  let saved;
  try {
    saved = localStorage.getItem("portfolio-theme");
  } catch {
    /* Storage may be unavailable. */
  }
  const theme =
    saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
