"use strict";

/**
 * GAME.JS
 * Tanggung jawab modul ini:
 *   - Memegang state kedai yang SEDANG AKTIF dimainkan
 *   - Game loop (tick system) untuk idle income
 *   - Offline income saat kedai dibuka kembali (dibatasi bahan baku)
 *   - Auto save berkala (setiap 30 detik)
 *
 * Sejak Tahap 2: produksi di setiap tick bergantung pada ketersediaan
 * bahan baku (Resource.areAllAvailable). Jika salah satu habis,
 * Wallet tidak bertambah. Offline income juga dibatasi sesuai stok
 * bahan baku yang tersisa saat game terakhir disimpan.
 */

const TICK_INTERVAL_MS = 1000;
const AUTOSAVE_INTERVAL_MS = 30000;

/**
 * Batas maksimum waktu offline yang dihitung (12 jam).
 * Berlaku SEBELUM pembatasan bahan baku -- bahan baku bisa
 * membatasi lebih jauh lagi dari angka ini.
 */
const MAX_OFFLINE_SECONDS = 12 * 60 * 60;

/**
 * Membuat state awal untuk SATU kedai baru (kedai kopi baru buka).
 * Sejak Tahap 2: menyertakan resources dari Resource.createInitialResourceState().
 * @returns {object}
 */
function createInitialState() {
  return {
    incomePerSecond: Shop.BASE_INCOME_PER_SECOND,

    employees: 0,
    shopLevel: 1,
    totalUpgrades: 0,

    playTimeSeconds: 0,

    totalCoffeeSold: 0,
    totalIncomeEarned: 0,
    totalUpgradesPurchased: 0,

    upgrades: {},

    // Stok bahan baku per kedai (Listrik, Air, Biji Kopi, Susu)
    resources: Resource.createInitialResourceState(),

    settings: {
      darkMode: false,
    },
  };
}

/**
 * Menggabungkan state hasil load dengan default state.
 * Menangani tiga level nested object: settings & resources.
 * @param {object} savedState
 * @returns {object}
 */
function mergeWithDefaultState(savedState) {
  const defaultState = createInitialState();

  return {
    ...defaultState,
    ...savedState,
    settings: {
      ...defaultState.settings,
      ...(savedState.settings || {}),
    },
    resources: mergeResources(
      defaultState.resources,
      savedState.resources || {},
    ),
  };
}

/**
 * Menggabungkan data resources tersimpan dengan default.
 * Aman terhadap resource ID baru yang belum ada di save lama,
 * dan mengabaikan resource ID yang tidak dikenal.
 * @param {object} defaultResources
 * @param {object} savedResources
 * @returns {object}
 */
function mergeResources(defaultResources, savedResources) {
  const merged = Utils.deepClone(defaultResources);

  Object.keys(savedResources).forEach((id) => {
    if (merged[id] && typeof savedResources[id]?.stockSeconds === "number") {
      merged[id].stockSeconds = savedResources[id].stockSeconds;
    }
  });

  return merged;
}

const Game = {
  state: null,
  activeShopId: null,
  activeShopName: "",
  loopId: null,
  autosaveLoopId: null,

  /** Menghitung ulang income/karyawan/level kedai dari upgrade yang dimiliki. */
  recalculateDerivedStats() {
    const { state } = this;
    state.incomePerSecond = Shop.calculateTotalIncomePerSecond(state);
    state.employees = Shop.calculateTotalEmployees(state);
    state.shopLevel = Shop.calculateShopLevel(state);
  },

  /**
   * Satu denyut permainan (dipanggil tiap 1 detik):
   *   - Jika semua bahan baku tersedia: setor income ke Wallet, kurangi stok.
   *   - Jika ada yang habis: produksi berhenti, stok tidak dikurangi.
   *   - Waktu bermain selalu bertambah terlepas dari status bahan baku.
   */
  tick() {
    const { state } = this;
    const producing = Resource.areAllAvailable(state);

    if (producing) {
      Wallet.add(state.incomePerSecond);
      state.totalIncomeEarned += state.incomePerSecond;
      state.totalCoffeeSold += 1 + state.employees;
      Resource.deplete(state);
    }

    state.playTimeSeconds += 1;

    Dashboard.render(state);
    Resource.render(state);

    if (producing) Wallet.pulse();

    Shop.updateAffordability(state);
  },

  startLoop() {
    if (this.loopId !== null) return;
    this.loopId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  },

  stopLoop() {
    if (this.loopId === null) return;
    clearInterval(this.loopId);
    this.loopId = null;
  },

  saveNow() {
    Wallet.persist();
    if (!this.activeShopId || !this.state) return false;
    return Storage.saveShopState(this.activeShopId, this.state);
  },

  startAutosave() {
    if (this.autosaveLoopId !== null) return;
    this.autosaveLoopId = setInterval(
      () => this.saveNow(),
      AUTOSAVE_INTERVAL_MS,
    );
  },

  stopAutosave() {
    if (this.autosaveLoopId === null) return;
    clearInterval(this.autosaveLoopId);
    this.autosaveLoopId = null;
  },

  /**
   * Memulai sesi bermain untuk satu kedai tertentu.
   * Dipanggil oleh Kedai.openShop().
   * @param {object} shopRecord
   */
  startSession(shopRecord) {
    this.activeShopId = shopRecord.id;
    this.activeShopName = shopRecord.name;
    this.state = mergeWithDefaultState(shopRecord.state);
    this.recalculateDerivedStats();

    this.applyOfflineIncome(shopRecord.lastSaveTimestamp);

    Settings.applyTheme(this.state.settings.darkMode);
    Settings.syncDarkModeToggle();

    Dashboard.render(this.state);
    Resource.render(this.state);
    Shop.render(this.state);

    this.startLoop();
    this.startAutosave();
  },

  /**
   * Menghitung & menambahkan income offline.
   * PENTING: produksi offline dibatasi oleh stok bahan baku yang tersisa.
   * Bahan baku paling sedikit stoknya menentukan berapa lama produksi bisa berjalan.
   * Setelah itu produksi berhenti walau waktu offline masih ada sisa.
   * @param {number} lastSaveTimestamp
   */
  applyOfflineIncome(lastSaveTimestamp) {
    const elapsedSeconds = Math.floor((Date.now() - lastSaveTimestamp) / 1000);
    if (elapsedSeconds < 5) return;

    const cappedSeconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);

    // Produksi offline hanya sebanyak stok bahan baku paling sedikit
    const minStock = Resource.getMinStockSeconds(this.state);
    const productionSeconds = Math.min(cappedSeconds, minStock);

    // Kurangi stok bahan baku sebesar waktu produksi yang berjalan
    Resource.applyOfflineDepletion(this.state, productionSeconds);

    if (productionSeconds <= 0) {
      // Bahan baku sudah habis sebelum game dibuka kembali
      this.showOfflineEmptyPopup(cappedSeconds);
      return;
    }

    const offlineIncome = productionSeconds * this.state.incomePerSecond;
    Wallet.add(offlineIncome);
    Wallet.persist();
    this.state.totalIncomeEarned += offlineIncome;

    const wasLimited = productionSeconds < cappedSeconds;
    this.showOfflineIncomePopup(
      cappedSeconds,
      productionSeconds,
      offlineIncome,
      wasLimited,
    );
  },

  /**
   * Popup ketika bahan baku sudah habis sejak sebelum game ditutup
   * sehingga tidak ada income offline sama sekali.
   */
  showOfflineEmptyPopup(offlineSeconds) {
    const emptyNames = Resource.getEmptyResourceNames(this.state);

    UI.showModal(`
      <h3 style="margin-bottom: 12px;">Selamat datang kembali! ☕</h3>
      <p class="text-muted" style="margin-bottom: 12px;">
        Anda offline selama <strong>${Utils.formatTime(offlineSeconds)}</strong>.
      </p>
      <div style="background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.3);
        border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <p style="color: var(--color-danger); font-weight: 600; margin-bottom: 4px;">
          ⚠️ Produksi berhenti — bahan baku habis sebelum Anda pergi:
        </p>
        <p style="color: var(--color-text-muted); font-size: 0.88rem;">${emptyNames.join(" &nbsp; ")}</p>
      </div>
      <p class="text-muted" style="margin-bottom: 20px;">
        Tidak ada pendapatan yang dihasilkan. Isi ulang bahan baku sekarang.
      </p>
      <button class="btn btn--primary" id="modal-close-btn" type="button" style="width: 100%;">
        Isi Ulang Bahan Baku
      </button>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => {
      UI.closeModal();
      // Arahkan ke Dashboard agar panel bahan baku langsung terlihat
      UI.switchPage("dashboard");
    });
  },

  /**
   * Popup "Selamat datang kembali" saat ada income offline.
   * Jika produksi lebih pendek dari waktu offline (bahan baku habis di tengah jalan),
   * ditampilkan keterangan tambahan resource mana yang habis.
   */
  showOfflineIncomePopup(
    offlineSeconds,
    productionSeconds,
    offlineIncome,
    wasLimited,
  ) {
    const emptyNames = wasLimited
      ? Resource.getEmptyResourceNames(this.state)
      : [];

    const limitedHtml = wasLimited
      ? `
        <div style="background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.3);
          border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.85rem;">
          <p style="color: var(--color-danger); font-weight: 600;">⚠️ Produksi berhenti setelah ${Utils.formatTime(productionSeconds)}</p>
          <p style="color: var(--color-text-muted); margin-top: 3px;">
            Kehabisan: ${emptyNames.join(" &nbsp; ")}
          </p>
        </div>
      `
      : "";

    UI.showModal(`
      <h3 style="margin-bottom: 12px;">Selamat datang kembali! ☕</h3>
      <p class="text-muted" style="margin-bottom: 10px;">
        Anda offline selama <strong>${Utils.formatTime(offlineSeconds)}</strong>.
        Kedai <em>${this.activeShopName}</em> beroperasi selama
        <strong>${Utils.formatTime(productionSeconds)}</strong>.
      </p>
      ${limitedHtml}
      <p style="font-size: 1.5rem; font-weight: 700; color: var(--color-success); margin-bottom: 20px;">
        +${Utils.formatMoney(offlineIncome)}
      </p>
      <button class="btn btn--primary" id="modal-close-btn" type="button" style="width: 100%;">
        Ambil &amp; Lanjut Bermain
      </button>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => {
      UI.closeModal();
    });
  },

  endSession() {
    this.saveNow();
    this.stopLoop();
    this.stopAutosave();
    this.state = null;
    this.activeShopId = null;
    this.activeShopName = "";
  },
};

// Tidak ada DOMContentLoaded di sini. kedai.js adalah titik masuk aplikasi.
