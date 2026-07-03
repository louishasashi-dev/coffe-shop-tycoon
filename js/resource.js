"use strict";

/**
 * RESOURCE.JS
 * Tanggung jawab modul ini HANYA:
 *   - Mendefinisikan 4 bahan baku (Listrik, Air, Biji Kopi, Susu)
 *   - Mengurangi stok 1 detik per tick (saat aktif, dipanggil game.js)
 *   - Menghitung batas offline income berdasarkan stok tersisa
 *   - Modal isi ulang (pembelian dari Wallet)
 *   - Menampilkan status bahan baku di panel Dashboard
 *
 * Modul ini TIDAK mengurus game loop atau Wallet secara langsung --
 * hanya meminta Wallet.spend() untuk pembelian, dan memberi sinyal
 * ke game.js lewat areAllAvailable() apakah produksi boleh berjalan.
 */

/**
 * Definisi setiap bahan baku.
 * costMultiplier: harga = incomePerSecond × costMultiplier.
 * Harga otomatis skala sesuai kemajuan game -- murah di awal, mahal di akhir,
 * tapi selalu proporsional dengan income saat itu.
 */
const RESOURCE_DEFINITIONS = [
  {
    id: "electricity",
    name: "Listrik",
    icon: "⚡",
    initialStock: 3600, // 1 jam gratis saat kedai baru dibuka
    maxStock: 86400, // cap 24 jam
    warningThreshold: 600, // peringatan saat < 10 menit tersisa
    refillOptions: [
      { label: "1 Jam", seconds: 3600, costMultiplier: 150 },
      { label: "8 Jam", seconds: 28800, costMultiplier: 1000 },
      { label: "24 Jam", seconds: 86400, costMultiplier: 2700 },
    ],
  },
  {
    id: "water",
    name: "Air",
    icon: "💧",
    initialStock: 3600,
    maxStock: 86400,
    warningThreshold: 600,
    refillOptions: [
      { label: "1 Jam", seconds: 3600, costMultiplier: 150 },
      { label: "8 Jam", seconds: 28800, costMultiplier: 1000 },
      { label: "24 Jam", seconds: 86400, costMultiplier: 2700 },
    ],
  },
  {
    id: "coffeeBeans",
    name: "Biji Kopi",
    icon: "☕",
    initialStock: 1800, // 30 menit gratis
    maxStock: 43200, // cap 12 jam
    warningThreshold: 300, // peringatan saat < 5 menit
    refillOptions: [
      { label: "30 Menit", seconds: 1800, costMultiplier: 100 },
      { label: "4 Jam", seconds: 14400, costMultiplier: 600 },
      { label: "12 Jam", seconds: 43200, costMultiplier: 1500 },
    ],
  },
  {
    id: "milk",
    name: "Susu",
    icon: "🥛",
    initialStock: 1800,
    maxStock: 43200,
    warningThreshold: 300,
    refillOptions: [
      { label: "30 Menit", seconds: 1800, costMultiplier: 80 },
      { label: "4 Jam", seconds: 14400, costMultiplier: 480 },
      { label: "12 Jam", seconds: 43200, costMultiplier: 1200 },
    ],
  },
];

const Resource = {
  DEFINITIONS: RESOURCE_DEFINITIONS,

  /** Harga minimum per opsi isi ulang (agar tidak Rp0 di awal game). */
  MIN_PRICE: 100,

  dom: {},

  init() {
    this.cacheDom();
    this.attachEventListeners();
  },

  cacheDom() {
    this.dom = {
      grid: document.getElementById("resource-grid"),
      haltedBanner: document.getElementById("production-halted-banner"),
    };
  },

  /**
   * Satu listener delegasi pada grid -- tidak perlu dipasang ulang
   * setiap kali kartu di-render ulang setiap detik.
   */
  attachEventListeners() {
    if (!this.dom.grid) return;
    this.dom.grid.addEventListener("click", (event) => {
      this.handleRestockClick(event);
    });
  },

  /* ===================== STATE AWAL ===================== */

  /**
   * Membuat objek resources awal untuk satu kedai baru.
   * Dipanggil oleh createInitialState() di game.js.
   * @returns {object}
   */
  createInitialResourceState() {
    const resources = {};
    RESOURCE_DEFINITIONS.forEach((def) => {
      resources[def.id] = { stockSeconds: def.initialStock };
    });
    return resources;
  },

  /* ===================== HELPER QUERY ===================== */

  getDefinitionById(id) {
    return RESOURCE_DEFINITIONS.find((def) => def.id === id);
  },

  getStockSeconds(state, id) {
    return state.resources?.[id]?.stockSeconds ?? 0;
  },

  /**
   * Produksi hanya boleh berjalan jika SEMUA bahan baku > 0.
   * Satu bahan habis → seluruh produksi berhenti.
   * @param {object} state
   * @returns {boolean}
   */
  areAllAvailable(state) {
    return RESOURCE_DEFINITIONS.every(
      (def) => this.getStockSeconds(state, def.id) > 0,
    );
  },

  /**
   * Stok minimum (detik) di antara semua bahan baku.
   * Dipakai untuk menghitung batas offline income:
   * produksi hanya berjalan selama stok paling sedikit masih ada.
   * @param {object} state
   * @returns {number}
   */
  getMinStockSeconds(state) {
    return Math.min(
      ...RESOURCE_DEFINITIONS.map((def) => this.getStockSeconds(state, def.id)),
    );
  },

  /**
   * Daftar nama bahan baku yang stoknya sudah habis (stok ≤ 0).
   * Dipakai untuk pesan popup offline & banner "produksi berhenti".
   * @param {object} state
   * @returns {string[]}
   */
  getEmptyResourceNames(state) {
    return RESOURCE_DEFINITIONS.filter(
      (def) => this.getStockSeconds(state, def.id) <= 0,
    ).map((def) => `${def.icon} ${def.name}`);
  },

  /* ===================== DEPLETION (DIPANGGIL GAME.JS) ===================== */

  /**
   * Kurangi stok semua bahan baku 1 detik per tick.
   * Hanya dipanggil ketika areAllAvailable() === true (sedang produksi).
   * @param {object} state
   */
  deplete(state) {
    RESOURCE_DEFINITIONS.forEach((def) => {
      if (state.resources?.[def.id]) {
        state.resources[def.id].stockSeconds = Math.max(
          0,
          state.resources[def.id].stockSeconds - 1,
        );
      }
    });
  },

  /**
   * Kurangi stok semua bahan baku sejumlah detik tertentu sekaligus.
   * Dipakai saat menghitung offline income: depletion sejumlah waktu
   * produksi yang sebenarnya berjalan (bukan seluruh waktu offline).
   * @param {object} state
   * @param {number} seconds
   */
  applyOfflineDepletion(state, seconds) {
    RESOURCE_DEFINITIONS.forEach((def) => {
      if (state.resources?.[def.id]) {
        state.resources[def.id].stockSeconds = Math.max(
          0,
          state.resources[def.id].stockSeconds - seconds,
        );
      }
    });
  },

  /* ===================== HARGA ===================== */

  /**
   * Harga isi ulang = incomePerSecond × costMultiplier,
   * minimal MIN_PRICE agar tidak nol di awal game.
   * @param {number} incomePerSecond
   * @param {number} costMultiplier
   * @returns {number}
   */
  calculateRefillPrice(incomePerSecond, costMultiplier) {
    return Math.max(
      this.MIN_PRICE,
      Math.round(incomePerSecond * costMultiplier),
    );
  },

  /* ===================== ISI ULANG ===================== */

  /** Handler klik pada tombol "Isi Ulang" di kartu resource (event delegation). */
  handleRestockClick(event) {
    const button = event.target.closest("[data-resource-id]");
    if (!button) return;

    const resourceId = button.dataset.resourceId;
    this.showRestockModal(resourceId);
  },

  /** Menampilkan modal pilihan isi ulang untuk satu bahan baku. */
  showRestockModal(resourceId) {
    const def = this.getDefinitionById(resourceId);
    if (!def) return;

    const currentStock = this.getStockSeconds(Game.state, resourceId);
    const income = Game.state.incomePerSecond;

    const optionsHtml = def.refillOptions
      .map((option, index) => {
        const price = this.calculateRefillPrice(income, option.costMultiplier);
        const resultStock = currentStock + option.seconds;
        const wouldExceedMax = resultStock > def.maxStock;
        const effectiveSeconds = wouldExceedMax
          ? def.maxStock - currentStock
          : option.seconds;
        const canAfford = Wallet.canAfford(price);
        const alreadyFull = effectiveSeconds <= 0;

        return `
          <button
            class="btn ${canAfford && !alreadyFull ? "btn--primary" : "btn--ghost"} resource-refill-option"
            type="button"
            data-option-index="${index}"
            data-resource-id="${resourceId}"
            ${!canAfford || alreadyFull ? "disabled" : ""}
            style="width: 100%; justify-content: space-between;"
          >
            <span>${def.icon} ${option.label} ${alreadyFull ? "(stok penuh)" : wouldExceedMax ? "(akan maks)" : ""}</span>
            <span class="resource-option__price">${Utils.formatMoney(price)}</span>
          </button>
        `;
      })
      .join("");

    UI.showModal(`
      <h3 style="margin-bottom: 8px;">${def.icon} Isi Ulang ${def.name}</h3>
      <p class="text-muted" style="margin-bottom: 6px;">
        Stok saat ini: <strong>${Utils.formatDuration(currentStock)}</strong>
        &nbsp;/&nbsp; Maks: ${Utils.formatDuration(def.maxStock)}
      </p>
      <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 16px;">
        Harga menyesuaikan income kedai saat ini (+${Utils.formatMoney(income)}/detik).
      </p>
      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
        ${optionsHtml}
      </div>
    `);

    // Pasang event listener pada tombol opsi di modal SETELAH modal dirender.
    document.querySelectorAll(".resource-refill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionIndex = parseInt(btn.dataset.optionIndex, 10);
        this.restock(Game.state, resourceId, optionIndex);
      });
    });
  },

  /**
   * Eksekusi isi ulang: kurangi Wallet → tambah stok → simpan & render.
   * @param {object} state
   * @param {string} resourceId
   * @param {number} optionIndex
   */
  restock(state, resourceId, optionIndex) {
    const def = this.getDefinitionById(resourceId);
    if (!def) return;

    const option = def.refillOptions[optionIndex];
    if (!option) return;

    const price = this.calculateRefillPrice(
      state.incomePerSecond,
      option.costMultiplier,
    );

    if (!Wallet.spend(price)) {
      UI.showToast("Saldo Wallet tidak cukup untuk isi ulang.", "danger");
      return;
    }

    const oldStock = state.resources[resourceId].stockSeconds;
    state.resources[resourceId].stockSeconds = Math.min(
      oldStock + option.seconds,
      def.maxStock,
    );
    const added = state.resources[resourceId].stockSeconds - oldStock;

    UI.closeModal();
    UI.showToast(
      `${def.icon} ${def.name} diisi ulang +${Utils.formatDuration(added)}`,
      "success",
    );

    this.render(state);
    Storage.saveShopState(Game.activeShopId, state);
  },

  /* ===================== RENDER ===================== */

  /**
   * Memperbarui panel bahan baku di Dashboard:
   * - Banner "produksi berhenti" ditampilkan/disembunyikan
   * - 4 kartu resource dirender ulang dengan stok & progress bar terbaru
   *
   * Dipanggil setiap tick oleh game.js, cukup ringan (hanya 4 kartu kecil).
   * @param {object} state
   */
  render(state) {
    if (!this.dom.grid) return;

    const allAvailable = this.areAllAvailable(state);
    const emptyNames = this.getEmptyResourceNames(state);

    // Tampilkan/sembunyikan banner "produksi berhenti"
    if (this.dom.haltedBanner) {
      this.dom.haltedBanner.hidden = allAvailable;
      if (!allAvailable) {
        this.dom.haltedBanner.querySelector(
          ".halted-banner__resources",
        ).textContent = emptyNames.join("  ");
      }
    }

    this.dom.grid.innerHTML = RESOURCE_DEFINITIONS.map((def) =>
      this.buildCardHtml(state, def),
    ).join("");
  },

  buildCardHtml(state, definition) {
    const stock = this.getStockSeconds(state, definition.id);
    const isEmpty = stock <= 0;
    const isWarning = !isEmpty && stock <= definition.warningThreshold;
    const progressPercent = Math.min(
      100,
      Math.round((stock / definition.maxStock) * 100),
    );

    const statusClass = isEmpty
      ? "resource-card--empty"
      : isWarning
        ? "resource-card--warning"
        : "";

    const barClass = isEmpty
      ? "resource-card__progress-bar--empty"
      : isWarning
        ? "resource-card__progress-bar--warning"
        : "resource-card__progress-bar--ok";

    const btnClass = isEmpty ? "btn--danger" : "btn--ghost";
    const btnLabel = isEmpty ? "⚠️ Isi Sekarang!" : "Isi Ulang";

    return `
      <div class="resource-card card ${statusClass}">
        <div class="resource-card__header">
          <span class="resource-card__icon" aria-hidden="true">${definition.icon}</span>
          <div>
            <p class="resource-card__name">${definition.name}</p>
            <p class="resource-card__time ${isEmpty ? "resource-card__time--empty" : ""}">
              ${isEmpty ? "HABIS" : Utils.formatDuration(stock) + " tersisa"}
            </p>
          </div>
        </div>

        <div class="resource-card__progress" role="progressbar" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
          <div class="resource-card__progress-bar ${barClass}" style="width: ${progressPercent}%"></div>
        </div>

        <button
          class="btn ${btnClass} resource-card__restock-btn"
          type="button"
          data-resource-id="${definition.id}"
        >
          ${btnLabel}
        </button>
      </div>
    `;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Resource.init();
});
