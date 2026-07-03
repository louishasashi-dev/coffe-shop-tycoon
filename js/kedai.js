"use strict";

/**
 * KEDAI.JS
 * Tanggung jawab modul ini:
 *   - Screen "Kedai Saya": panel ekspansi + daftar kartu kedai
 *   - Membuat kedai baru (validasi syarat + potong biaya ekspansi)
 *   - Membuka / menghapus kedai
 *   - Berpindah antara screen "Kedai Saya" dan screen "Game"
 *
 * SEJAK TAHAP 3 — Syarat buka kedai baru (selain kedai pertama):
 *   1. Semua upgrade di SEMUA kedai yang sudah ada harus MAX (290 level).
 *   2. Biaya ekspansi dibayar dari Wallet:
 *        Kedai ke-2 : Rp500.000.000
 *        Kedai ke-3 : Rp2.000.000.000  (500jt × 4^1)
 *        Kedai ke-4 : Rp8.000.000.000  (500jt × 4^2)
 *        Kedai ke-n : 500jt × 4^(n-2)   → naik 4× tiap kedai baru
 */

/** Biaya ekspansi dasar (untuk kedai ke-2). */
const EXPANSION_COST_BASE = 500_000_000;

/** Multiplier biaya ekspansi tiap tambah satu kedai baru. */
const EXPANSION_COST_MULTIPLIER = 4;

const Kedai = {
  dom: {},

  init() {
    this.cacheDom();
    this.attachStaticEventListeners();
    this.renderSelectorScreen();
    this.showSelectorScreen();
  },

  cacheDom() {
    this.dom = {
      screenSelector: document.getElementById("screen-shop-selector"),
      screenGame: document.getElementById("screen-game"),
      expansionPanelContainer: document.getElementById(
        "expansion-panel-container",
      ),
      shopList: document.getElementById("kedai-list"),
      emptyState: document.getElementById("kedai-empty-state"),
      switchShopBtn: document.getElementById("sidebar-switch-kedai-btn"),
      activeShopNameLabel: document.getElementById("active-kedai-name"),
    };
  },

  /**
   * Pasang semua event listener SEKALI saja.
   * Konten panel dan kartu kedai bersifat dinamis (di-render ulang saat state berubah),
   * jadi listener dipasang lewat event delegation pada container-nya,
   * bukan pada elemen individual yang bisa hilang saat render ulang.
   */
  attachStaticEventListeners() {
    // Tombol "Ganti Kedai" di sidebar screen game
    this.dom.switchShopBtn.addEventListener("click", () =>
      this.handleSwitchShop(),
    );

    // Event delegation: kartu kedai (Buka / Hapus)
    this.dom.shopList.addEventListener("click", (event) => {
      this.handleShopListClick(event);
    });

    // Event delegation: tombol di panel ekspansi
    this.dom.expansionPanelContainer.addEventListener("click", (event) => {
      this.handleExpansionPanelClick(event);
    });
  },

  /* ===================== RENDER SELECTOR SCREEN ===================== */

  /**
   * Me-render SELURUH konten screen "Kedai Saya" (panel ekspansi + daftar kedai).
   * Dipanggil setiap kali screen ini perlu diperbarui:
   * saat init, setelah ganti kedai, setelah buat/hapus kedai.
   */
  renderSelectorScreen() {
    const shops = Storage.getAllShops();
    this.renderExpansionPanel(shops);
    this.renderShopList(shops);
  },

  /* ===================== PANEL EKSPANSI ===================== */

  /**
   * Me-render panel ekspansi ke dalam container-nya.
   * Panel ini menampilkan status syarat dan tombol buka kedai baru.
   * @param {Array<object>} shops
   */
  renderExpansionPanel(shops) {
    if (!this.dom.expansionPanelContainer) return;
    const req = this.getExpansionRequirements(shops);
    this.dom.expansionPanelContainer.innerHTML =
      this.buildExpansionPanelHtml(req);
  },

  /**
   * Menganalisis semua syarat untuk membuka kedai baru.
   * Mengembalikan objek status yang dipakai untuk render HTML dan validasi.
   * @param {Array<object>} shops - array dari Storage.getAllShops()
   * @returns {object}
   */
  getExpansionRequirements(shops) {
    const isFree = shops.length === 0;
    const cost = this.calculateExpansionCost(shops.length);
    const nextShopNumber = shops.length + 1;

    const shopStatuses = shops.map((shop) => {
      const levelsOwned = Shop.getTotalLevelsOwned(shop.state);
      const levelsMax = Shop.getTotalMaxLevels();
      return {
        id: shop.id,
        name: shop.name,
        isMaxed: Shop.isFullyMaxed(shop.state),
        levelsOwned,
        levelsMax,
        progressPercent: Math.round((levelsOwned / levelsMax) * 100),
      };
    });

    const allShopsMaxed = isFree || shopStatuses.every((s) => s.isMaxed);
    const canAfford = isFree || Wallet.canAfford(cost);
    const canCreate = allShopsMaxed && canAfford;

    return {
      isFree,
      cost,
      nextShopNumber,
      shopStatuses,
      allShopsMaxed,
      canAfford,
      canCreate,
    };
  },

  buildExpansionPanelHtml(req) {
    // ── Kedai pertama: tampilkan ajakan sederhana ──
    if (req.isFree) {
      return `
        <div class="expansion-panel card">
          <div class="expansion-panel__free">
            <p class="expansion-panel__free-icon" aria-hidden="true">🏪</p>
            <h3>Buka Kedai Pertama</h3>
            <p class="text-muted">Gratis! Mulai petualangan kopi Anda dari kedai kecil sederhana.</p>
            <button class="btn btn--primary expansion-panel__create-btn" id="expansion-create-btn" type="button">
              + Buka Kedai Pertama
            </button>
          </div>
        </div>
      `;
    }

    // ── Kedai ke-2 dan seterusnya: tampilkan syarat & harga ──
    const {
      cost,
      nextShopNumber,
      shopStatuses,
      allShopsMaxed,
      canAfford,
      canCreate,
    } = req;

    // Status setiap kedai yang ada
    const shopStatusesHtml = shopStatuses
      .map(
        (s) => `
      <div class="req-item ${s.isMaxed ? "req-item--ok" : "req-item--fail"}">
        <div class="req-item__header">
          <span class="req-item__icon" aria-hidden="true">${s.isMaxed ? "✅" : "❌"}</span>
          <span class="req-item__name">${this.escapeHtml(s.name)}</span>
          <span class="req-item__status">
            ${s.isMaxed ? "⭐ MAX" : s.levelsOwned + " / " + s.levelsMax}
          </span>
        </div>
        ${
          !s.isMaxed
            ? `
          <div class="req-item__progress"
               role="progressbar"
               aria-valuenow="${s.progressPercent}"
               aria-valuemin="0"
               aria-valuemax="100">
            <div class="req-item__progress-bar" style="width: ${s.progressPercent}%"></div>
          </div>
        `
            : ""
        }
      </div>
    `,
      )
      .join("");

    // Status saldo Wallet
    const walletStatusHtml = `
      <div class="req-item ${canAfford ? "req-item--ok" : "req-item--fail"}">
        <div class="req-item__header">
          <span class="req-item__icon" aria-hidden="true">${canAfford ? "✅" : "❌"}</span>
          <span class="req-item__name">💰 Saldo Wallet</span>
          <span class="req-item__status">
            ${
              canAfford
                ? Utils.formatMoney(Wallet.balance) + " (cukup)"
                : Utils.formatMoney(Wallet.balance) +
                  " / " +
                  Utils.formatMoney(cost)
            }
          </span>
        </div>
        ${
          !canAfford
            ? `
          <div class="req-item__progress"
               role="progressbar"
               aria-valuenow="${Math.round((Wallet.balance / cost) * 100)}"
               aria-valuemin="0"
               aria-valuemax="100">
            <div class="req-item__progress-bar req-item__progress-bar--wallet"
                 style="width: ${Math.min(100, Math.round((Wallet.balance / cost) * 100))}%">
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    return `
      <div class="expansion-panel card">
        <div class="expansion-panel__header">
          <div>
            <h3 class="expansion-panel__title">🏪 Ekspansi — Kedai ke-${nextShopNumber}</h3>
            <p class="expansion-panel__cost text-muted">
              Biaya ekspansi:
              <strong style="color: var(--color-coffee);">${Utils.formatMoney(cost)}</strong>
            </p>
          </div>
          ${canCreate ? '<span class="expansion-panel__ready-badge">✨ Siap Ekspansi!</span>' : ""}
        </div>

        <div class="expansion-panel__requirements">

          <div class="req-section">
            <p class="req-section__label">
              <span class="req-section__check" aria-hidden="true">${allShopsMaxed ? "✅" : "❌"}</span>
              Semua upgrade di semua kedai harus mencapai level MAX
            </p>
            <div class="req-section__items">${shopStatusesHtml}</div>
          </div>

          <div class="req-section">
            <p class="req-section__label">
              <span class="req-section__check" aria-hidden="true">${canAfford ? "✅" : "❌"}</span>
              Biaya ekspansi tersedia di Wallet
            </p>
            <div class="req-section__items">${walletStatusHtml}</div>
          </div>

        </div>

        <button
          class="btn ${canCreate ? "btn--primary" : "btn--ghost"} expansion-panel__create-btn"
          id="expansion-create-btn"
          type="button"
          ${canCreate ? "" : "disabled"}
        >
          ${
            canCreate
              ? `+ Buka Kedai ke-${nextShopNumber} &nbsp;(${Utils.formatMoney(cost)})`
              : "🔒 Syarat Belum Terpenuhi"
          }
        </button>
      </div>
    `;
  },

  /** Klik pada tombol "Buka Kedai" / "Buka Kedai ke-N" di panel ekspansi. */
  handleExpansionPanelClick(event) {
    const btn = event.target.closest("#expansion-create-btn");
    if (!btn || btn.disabled) return;

    const shops = Storage.getAllShops();
    const req = this.getExpansionRequirements(shops);
    if (req.canCreate) this.handleNewShopPrompt(req);
  },

  /* ===================== DAFTAR KARTU KEDAI ===================== */

  renderShopList(shops) {
    if (this.dom.emptyState) {
      this.dom.emptyState.hidden = shops.length > 0;
    }
    this.dom.shopList.innerHTML = shops
      .map((shop) => this.buildCardHtml(shop))
      .join("");
  },

  buildCardHtml(shop) {
    const { state } = shop;
    const levelsOwned = Shop.getTotalLevelsOwned(state);
    const levelsMax = Shop.getTotalMaxLevels();
    const isMaxed = Shop.isFullyMaxed(state);
    const progressPercent = Math.round((levelsOwned / levelsMax) * 100);

    return `
      <div class="kedai-card card ${isMaxed ? "kedai-card--maxed" : ""}" data-kedai-id="${shop.id}">

        <div class="kedai-card__header">
          <span class="kedai-card__icon" aria-hidden="true">☕</span>
          <div class="kedai-card__info">
            <p class="kedai-card__name">${this.escapeHtml(shop.name)}</p>
            <p class="kedai-card__meta text-muted">
              Level ${state.shopLevel} &middot; ${Utils.formatDateShort(shop.createdAt)}
            </p>
          </div>
          ${isMaxed ? '<span class="kedai-card__max-badge">⭐ MAX</span>' : ""}
        </div>

        <p class="kedai-card__income">+${Utils.formatMoney(state.incomePerSecond)} / detik</p>

        <div class="kedai-card__upgrade-progress">
          <div class="kedai-card__upgrade-bar-wrap">
            <div class="kedai-card__upgrade-bar" style="width: ${progressPercent}%"></div>
          </div>
          <p class="kedai-card__upgrade-text ${isMaxed ? "kedai-card__upgrade-text--maxed" : ""}">
            ${
              isMaxed
                ? "⭐ Semua upgrade MAX"
                : levelsOwned + " / " + levelsMax + " level upgrade"
            }
          </p>
        </div>

        <div class="kedai-card__actions">
          <button class="btn btn--primary kedai-card__open-btn"
                  type="button"
                  data-action="open"
                  data-kedai-id="${shop.id}">
            Buka Kedai
          </button>
          <button class="btn btn--ghost kedai-card__delete-btn"
                  type="button"
                  data-action="delete"
                  data-kedai-id="${shop.id}"
                  aria-label="Hapus kedai ${this.escapeHtml(shop.name)}">
            🗑️
          </button>
        </div>

      </div>
    `;
  },

  /** Mencegah nama kedai (input bebas) merusak HTML. */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /* ===================== EVENT HANDLER ===================== */

  handleShopListClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = button.dataset.kedaiId;
    const action = button.dataset.action;

    if (action === "open") this.openShop(id);
    if (action === "delete") this.confirmDeleteShop(id);
  },

  /** Modal isi nama kedai baru (dipanggil setelah syarat terpenuhi). */
  handleNewShopPrompt(req) {
    if (!req.canCreate) return;

    const costHtml = req.isFree
      ? ""
      : `
      <p class="text-muted" style="margin-bottom: 12px;">
        Biaya <strong>${Utils.formatMoney(req.cost)}</strong> akan dipotong dari Wallet Anda
        (saldo sekarang: ${Utils.formatMoney(Wallet.balance)}).
      </p>
    `;

    UI.showModal(`
      <h3 style="margin-bottom: 12px;">
        ${req.isFree ? "Buka Kedai Pertama ☕" : `Ekspansi: Kedai ke-${req.nextShopNumber} 🏪`}
      </h3>
      ${costHtml}
      <p class="text-muted" style="margin-bottom: 14px;">
        Beri nama unik untuk kedai kopi impian Anda.
        Kedai baru selalu mulai dari nol (upgrade kosong, bahan baku awal gratis).
      </p>
      <input
        type="text"
        id="new-kedai-name-input"
        class="text-input"
        placeholder="Misal: Kedai Kopi Senja"
        maxlength="30"
        autocomplete="off"
      />
      <button
        class="btn btn--primary"
        id="new-kedai-confirm-btn"
        type="button"
        style="margin-top: 14px; width: 100%;"
      >
        ${
          req.isFree
            ? "Buka Kedai"
            : `Buka Kedai &amp; Bayar ${Utils.formatMoney(req.cost)}`
        }
      </button>
    `);

    const input = document.getElementById("new-kedai-name-input");
    input.focus();

    const submit = () => this.handleCreateShop(input.value, req);
    document
      .getElementById("new-kedai-confirm-btn")
      .addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  },

  /**
   * Eksekusi pembuatan kedai:
   *   1. Validasi nama tidak kosong
   *   2. Potong biaya ekspansi dari Wallet (kecuali kedai pertama)
   *   3. Buat record kedai baru lewat Storage
   *   4. Langsung buka kedai tersebut
   * @param {string} rawName
   * @param {object} req - hasil getExpansionRequirements()
   */
  handleCreateShop(rawName, req) {
    const name = rawName.trim();
    if (!name) {
      UI.showToast("Nama kedai tidak boleh kosong.", "danger");
      return;
    }

    if (!req.isFree) {
      // Double-check saldo sebelum memotong, untuk menghindari race condition
      if (!Wallet.spend(req.cost)) {
        UI.showToast("Saldo Wallet tidak mencukupi.", "danger");
        return;
      }
    }

    const record = Storage.createShop(name, createInitialState());

    UI.closeModal();
    UI.showToast(
      req.isFree
        ? `Selamat datang di dunia kopi! Kedai "${name}" siap dibuka. ☕`
        : `Ekspansi berhasil! Kedai ke-${req.nextShopNumber} "${name}" dibuka. 🎉`,
      "success",
    );

    this.renderSelectorScreen();
    this.openShop(record.id);
  },

  confirmDeleteShop(id) {
    const shop = Storage.getShop(id);
    if (!shop) return;

    UI.showConfirm({
      title: "Hapus Kedai?",
      message: `Kedai "${shop.name}" dan seluruh progres upgrade-nya akan dihapus permanen. Saldo Wallet tidak berkurang. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus",
      danger: true,
      onConfirm: () => {
        Storage.deleteShop(id);
        this.renderSelectorScreen();
        UI.showToast(`Kedai "${shop.name}" telah dihapus.`, "success");
      },
    });
  },

  /* ===================== FORMULA BIAYA EKSPANSI ===================== */

  /**
   * Menghitung biaya ekspansi berdasarkan jumlah kedai yang sudah dimiliki.
   *   existingCount = 0 → gratis (kedai pertama)
   *   existingCount = 1 → Rp500.000.000  (kedai ke-2)
   *   existingCount = 2 → Rp2.000.000.000 (kedai ke-3)
   *   existingCount = n → 500jt × 4^(n-1) (naik 4× tiap kedai baru)
   * @param {number} existingCount - jumlah kedai yang SUDAH dimiliki saat ini
   * @returns {number} biaya dalam rupiah
   */
  calculateExpansionCost(existingCount) {
    if (existingCount === 0) return 0;
    return Math.round(
      EXPANSION_COST_BASE *
        Math.pow(EXPANSION_COST_MULTIPLIER, existingCount - 1),
    );
  },

  /* ===================== PINDAH SCREEN ===================== */

  openShop(id) {
    const shop = Storage.getShop(id);
    if (!shop) {
      UI.showToast("Kedai tidak ditemukan.", "danger");
      return;
    }

    Game.startSession(shop);
    this.dom.activeShopNameLabel.textContent = shop.name;
    this.showGameScreen();
  },

  handleSwitchShop() {
    Game.endSession();
    this.renderSelectorScreen();
    this.showSelectorScreen();
  },

  showSelectorScreen() {
    this.dom.screenSelector.hidden = false;
    this.dom.screenGame.hidden = true;
  },

  showGameScreen() {
    this.dom.screenSelector.hidden = true;
    this.dom.screenGame.hidden = false;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Kedai.init();
});
