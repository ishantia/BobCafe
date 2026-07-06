/**
 * Bobcafe — menu application
 * ---------------------------------------------------------------
 * Loads /assets/menu.json dynamically and renders the entire menu.
 * No menu content is ever hardcoded — add items to menu.json only.
 * ---------------------------------------------------------------
 */
(() => {
  "use strict";

  /* ------------------------------------------------------------
   * Config & state (module-scoped, no globals leak to window)
   * ---------------------------------------------------------- */
  const CONFIG = {
    dataUrl: "assets/menu.json",
    imageBase: "assets/images/",
    fallbackImage: "assets/images/fallback.svg",
    allChipLabel: "همه",
    searchDebounceMs: 220,
  };

  const state = {
    items: [],
    categories: [],
    activeCategory: "all",
    searchTerm: "",
    status: "loading", // loading | ready | error
  };

  /* ------------------------------------------------------------
   * DOM references
   * ---------------------------------------------------------- */
  const dom = {
    skeletonGrid: document.getElementById("skeletonGrid"),
    menuGrid: document.getElementById("menuGrid"),
    errorState: document.getElementById("errorState"),
    errorMessage: document.getElementById("errorMessage"),
    emptyState: document.getElementById("emptyState"),
    retryButton: document.getElementById("retryButton"),
    resetFilters: document.getElementById("resetFilters"),
    resultCount: document.getElementById("resultCount"),
    categoryChips: document.getElementById("categoryChips"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    controls: document.getElementById("controls"),
    themeToggle: document.getElementById("themeToggle"),
    backToTop: document.getElementById("backToTop"),
    footerYear: document.getElementById("footerYear"),
  };

  /* ------------------------------------------------------------
   * Utilities
   * ---------------------------------------------------------- */

  const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  /** Convert a number's digits to Persian numerals with thousands separators. */
  function toPersianPrice(value) {
    const rounded = Math.round(Number(value) || 0);
    const withSeparators = rounded.toLocaleString("en-US"); // "145,000"
    const persianized = withSeparators.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d]).replace(/,/g, "٬");
    return `${persianized} تومان`;
  }

  /** Escape a string for safe HTML insertion. */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  /** Wrap the matched search term in <mark> for highlighting. */
  function highlight(text, term) {
    const safe = escapeHtml(text ?? "");
    if (!term) return safe;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escapedTerm})`, "ig");
    return safe.replace(re, "<mark>$1</mark>");
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  /** Basic Persian-friendly normalization so ي/ی and ك/ک both match. */
  function normalize(str) {
    return (str ?? "")
      .toString()
      .toLowerCase()
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .trim();
  }

  /* ------------------------------------------------------------
   * Data loading
   * ---------------------------------------------------------- */

  async function loadMenu() {
    setStatus("loading");
    try {
      const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("فرمت داده نامعتبر است");
      if (raw.length === 0) throw new Error("EMPTY");

      state.items = raw
        .filter((item) => item && typeof item === "object")
        .map(normalizeItem)
        .filter(Boolean);

      if (state.items.length === 0) throw new Error("EMPTY");

      state.categories = buildCategoryList(state.items);
      setStatus("ready");
      renderChips();
      renderGrid();
    } catch (err) {
      console.error("[Bobcafe] Failed to load menu:", err);
      setStatus("error", err && err.message === "EMPTY"
        ? "در حال حاضر موردی در منو ثبت نشده است."
        : "مشکلی در بارگذاری منو پیش آمد. لطفاً اتصال اینترنت را بررسی کرده و دوباره تلاش کنید.");
    }
  }

  /** Fill in graceful defaults for any missing/malformed fields. */
  function normalizeItem(item) {
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "بدون نام";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const category = typeof item.category === "string" && item.category.trim() ? item.category.trim() : "متفرقه";
    const price = Number.isFinite(Number(item.price)) ? Number(item.price) : null;
    const image = typeof item.image === "string" && item.image.trim() ? item.image.trim() : "";

    return { name, description, category, price, image };
  }

  function buildCategoryList(items) {
    const counts = new Map();
    for (const item of items) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }

  function setStatus(status, message) {
    state.status = status;
    dom.skeletonGrid.hidden = status !== "loading";
    dom.skeletonGrid.style.display = status === "loading" ? "" : "none";
    dom.errorState.hidden = status !== "error";
    dom.menuGrid.hidden = status !== "ready";
    if (status === "error") {
      dom.errorMessage.textContent = message || dom.errorMessage.textContent;
    }
  }

  /* ------------------------------------------------------------
   * Rendering: skeleton
   * ---------------------------------------------------------- */

  function renderSkeleton(count = 8) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const card = document.createElement("div");
      card.className = "skel-card";
      card.innerHTML = `
        <div class="skel-media"></div>
        <div class="skel-body">
          <div class="skel-line w60"></div>
          <div class="skel-line w90"></div>
          <div class="skel-line w40"></div>
        </div>`;
      frag.appendChild(card);
    }
    dom.skeletonGrid.appendChild(frag);
  }

  /* ------------------------------------------------------------
   * Rendering: category chips
   * ---------------------------------------------------------- */

  function renderChips() {
    const frag = document.createDocumentFragment();

    const allChip = createChip(CONFIG.allChipLabel, "all", state.items.length);
    frag.appendChild(allChip);

    for (const cat of state.categories) {
      frag.appendChild(createChip(cat.name, cat.name, cat.count));
    }

    dom.categoryChips.innerHTML = "";
    dom.categoryChips.appendChild(frag);
  }

  function createChip(label, value, count) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("role", "tab");
    chip.dataset.value = value;
    chip.setAttribute("aria-selected", String(value === state.activeCategory));
    chip.innerHTML = `<span>${escapeHtml(label)}</span><span class="chip__count">${toPersianDigitsOnly(count)}</span>`;
    return chip;
  }

  function toPersianDigitsOnly(n) {
    return String(n).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d]);
  }

  /* ------------------------------------------------------------
   * Rendering: menu grid (with search + category filtering)
   * ---------------------------------------------------------- */

  function getFilteredItems() {
    const term = normalize(state.searchTerm);
    return state.items.filter((item) => {
      const matchesCategory = state.activeCategory === "all" || item.category === state.activeCategory;
      if (!matchesCategory) return false;
      if (!term) return true;
      const haystack = normalize(`${item.name} ${item.description} ${item.category}`);
      return haystack.includes(term);
    });
  }

  function renderGrid() {
    const filtered = getFilteredItems();
    dom.menuGrid.innerHTML = "";

    if (filtered.length === 0) {
      dom.emptyState.hidden = false;
      dom.menuGrid.hidden = true;
      dom.resultCount.textContent = "";
      return;
    }
    dom.emptyState.hidden = true;
    dom.menuGrid.hidden = false;

    const term = state.searchTerm.trim();
    const frag = document.createDocumentFragment();

    if (state.activeCategory === "all" && !term) {
      // Grouped view by category, preserving first-seen order
      const grouped = groupByCategory(filtered);
      let cardIndex = 0;
      for (const [categoryName, items] of grouped) {
        const heading = document.createElement("div");
        heading.className = "category-heading";
        heading.innerHTML = `
          <h2 class="category-heading__title">${escapeHtml(categoryName)}</h2>
          <span class="category-heading__count">${toPersianDigitsOnly(items.length)} مورد</span>`;
        frag.appendChild(heading);
        for (const item of items) {
          frag.appendChild(createCard(item, term, cardIndex++));
        }
      }
    } else {
      filtered.forEach((item, i) => frag.appendChild(createCard(item, term, i)));
    }

    dom.menuGrid.appendChild(frag);
    dom.resultCount.textContent = `${toPersianDigitsOnly(filtered.length)} مورد نمایش داده شد`;
  }

  function groupByCategory(items) {
    const map = new Map();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return map;
  }

  function createCard(item, searchTerm, index) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--i", String(index % 12));

    const imgSrc = item.image ? `${CONFIG.imageBase}${item.image}` : CONFIG.fallbackImage;
    const priceMarkup = item.price !== null
      ? `<span class="card__price">${toPersianPrice(item.price)}</span>`
      : `<span class="card__price"><small>قیمت نامشخص</small></span>`;

    card.innerHTML = `
      <div class="card__media">
        <img
          src="${escapeHtml(imgSrc)}"
          alt="${escapeHtml(item.name)}"
          loading="lazy"
          decoding="async"
          width="236" height="236">
        <span class="card__badge">${escapeHtml(item.category)}</span>
      </div>
      <div class="card__body">
        <h3 class="card__name">${highlight(item.name, searchTerm)}</h3>
        ${item.description ? `<p class="card__desc">${highlight(item.description, searchTerm)}</p>` : ""}
        <div class="card__footer">
          ${priceMarkup}
          <span class="card__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12h16M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
      </div>`;

    // Graceful image fallback if the file is missing or fails to load
    const img = card.querySelector("img");
    img.addEventListener("error", () => {
      if (img.src.indexOf(CONFIG.fallbackImage) === -1) {
        img.src = CONFIG.fallbackImage;
      }
    }, { once: true });

    return card;
  }

  /* ------------------------------------------------------------
   * Event wiring
   * ---------------------------------------------------------- */

  function initSearch() {
    const handleInput = debounce((value) => {
      state.searchTerm = value;
      dom.searchClear.hidden = value.length === 0;
      renderGrid();
    }, CONFIG.searchDebounceMs);

    dom.searchInput.addEventListener("input", (e) => handleInput(e.target.value));

    dom.searchClear.addEventListener("click", () => {
      dom.searchInput.value = "";
      state.searchTerm = "";
      dom.searchClear.hidden = true;
      dom.searchInput.focus();
      renderGrid();
    });
  }

  function initChips() {
    // Event delegation — one listener handles all current and future chips
    dom.categoryChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.activeCategory = chip.dataset.value;
      [...dom.categoryChips.children].forEach((c) => {
        c.setAttribute("aria-selected", String(c === chip));
      });
      renderGrid();
    });
  }

  function initStates() {
    dom.retryButton.addEventListener("click", loadMenu);
    dom.resetFilters.addEventListener("click", () => {
      state.searchTerm = "";
      state.activeCategory = "all";
      dom.searchInput.value = "";
      dom.searchClear.hidden = true;
      [...dom.categoryChips.children].forEach((c) => {
        c.setAttribute("aria-selected", String(c.dataset.value === "all"));
      });
      renderGrid();
    });
  }

  function initStickyShadow() {
    const sentinel = document.getElementById("top");
    if (!("IntersectionObserver" in window) || !sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => dom.controls.classList.toggle("is-stuck", !entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    io.observe(sentinel);
  }

  function initBackToTop() {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        dom.backToTop.hidden = false;
        dom.backToTop.classList.toggle("is-visible", window.scrollY > 640);
        ticking = false;
      });
    }, { passive: true });

    dom.backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initTheme() {
    // Session-only override on top of the OS-level prefers-color-scheme.
    // No storage is used, so the app always launches following the OS setting.
    let manualTheme = null;

    dom.themeToggle.addEventListener("click", () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const currentlyDark = manualTheme ? manualTheme === "dark" : prefersDark;
      manualTheme = currentlyDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", manualTheme);
      dom.themeToggle.setAttribute("aria-pressed", String(manualTheme === "dark"));
    });
  }

  function initFooterYear() {
    dom.footerYear.textContent = toPersianDigitsOnly(new Date().getFullYear());
  }

  /* ------------------------------------------------------------
   * Boot
   * ---------------------------------------------------------- */

  function init() {
    renderSkeleton();
    initSearch();
    initChips();
    initStates();
    initStickyShadow();
    initBackToTop();
    initTheme();
    initFooterYear();
    loadMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();