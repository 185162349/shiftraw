// Language switcher dropdown behavior
(function () {
  var sw = document.querySelector(".lang-switch");
  if (!sw) return;
  var btn = sw.querySelector(".lang-btn");
  if (!btn) return;

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    sw.classList.toggle("open");
    btn.setAttribute("aria-expanded", sw.classList.contains("open") ? "true" : "false");
  });

  document.addEventListener("click", function (e) {
    if (!sw.contains(e.target)) {
      sw.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      sw.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
})();
