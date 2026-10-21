(function () {
  try {
    var stored = localStorage.getItem("bo-theme") || "system";
    var dark =
      stored === "dark" ||
      (stored === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (_) {
    /* localStorage can be unavailable in private mode. */
  }
})();
