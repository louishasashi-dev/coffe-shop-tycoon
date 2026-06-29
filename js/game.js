"use strict";

/**
 * GAME.JS
 * Tanggung jawab modul ini:
 *   - Menyimpan & memegang state utama game
 *   - Game loop (tick system) untuk idle income
 *   - Offline income saat game dibuka kembali
 *   - Auto save berkala (setiap 30 detik)
 *
 * Sejak tahap ini, state juga menyimpan preferensi pemain (settings),
 * misalnya Dark Mode, yang diterapkan lewat Settings.js.
 */

const TICK_INTERVAL_MS = 1000;
const AUTOSAVE_INTERVAL_MS = 30000;

/** Batas maksimum waktu offline yang dihitung (12 jam), agar income tidak meledak jika save lama tidak dibuka. */
const MAX_OFFLINE_SECONDS = 12 * 60 * 60;

/**
 * Membuat state awal game (kedai kopi baru).
 * @returns {object}
 */
function createInitialState() {
  return {
    money: 500,
    incomePerSecond: Shop.BASE_INCOME_PER_SECOND,

    employees: 0,
    shopLevel: 1,
    totalUpgrades: 0,

    playTimeSeconds: 0,

    totalCoffeeSold: 0,
    totalIncomeEarned: 0,
    totalUpgradesPurchased: 0,

    // Menyimpan level setiap upgrade, contoh: { coffeeMachine: 3, barista: 1 }
    upgrades: {},

    // Preferensi pemain, dikelola oleh settings.js
    settings: {
      darkMode: false,
    },
  };
}

/**
 * Menggabungkan state hasil load dengan default state, agar field
 * baru yang belum ada di save lama (misalnya "settings" untuk pemain
 * yang main sejak sebelum Tahap 5) tetap terisi nilai default.
 * @param {object} savedState
 * @returns {object}
 */
function mergeWithDefaultState(savedState) {
  const defaultState = createInitialState();
  return {
    ...defaultState,
    ...savedState,
    settings: { ...defaultState.settings, ...(savedState.settings || {}) },
  };
}

const Game = {
  state: createInitialState(),
  loopId: null,
  autosaveLoopId: null,

  /** Menghitung ulang income/karyawan/level kedai dari upgrade yang dimiliki. */
  recalculateDerivedStats() {
    const { state } = this;
    state.incomePerSecond = Shop.calculateTotalIncomePerSecond(state);
    state.employees = Shop.calculateTotalEmployees(state);
    state.shopLevel = Shop.calculateShopLevel(state);
  },

  /** Satu denyut permainan: idle income + waktu bermain bertambah. */
  tick() {
    const { state } = this;

    state.money += state.incomePerSecond;
    state.totalIncomeEarned += state.incomePerSecond;
    state.playTimeSeconds += 1;

    // Kopi terjual mengikuti jumlah karyawan: makin banyak karyawan,
    // makin banyak kopi yang bisa dilayani tiap detik.
    state.totalCoffeeSold += 1 + state.employees;

    Dashboard.render(state);
    Dashboard.pulseMoney();
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

  /** Menyimpan state saat ini lewat Storage.js. Dipakai autosave & tombol manual. */
  saveNow() {
    return Storage.save(this.state);
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
   * Memuat save yang ada (jika ada), menghitung ulang stat turunan,
   * lalu menghitung income offline berdasarkan selisih waktu.
   */
  loadSaveAndApplyOfflineIncome() {
    const saveData = Storage.load();
    if (saveData) {
      this.state = mergeWithDefaultState(saveData.state);
    }

    // Pastikan income/karyawan/level kedai akurat SEBELUM menghitung
    // offline income, supaya tidak memakai angka lama yang mungkin keliru.
    this.recalculateDerivedStats();

    if (!saveData) return; // baru pertama main, tidak ada offline income

    const elapsedSeconds = Math.floor(
      (Date.now() - saveData.lastSaveTimestamp) / 1000,
    );
    if (elapsedSeconds < 5) return; // selisih terlalu kecil, tidak perlu popup

    const cappedSeconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
    const offlineIncome = cappedSeconds * this.state.incomePerSecond;

    this.state.money += offlineIncome;
    this.state.totalIncomeEarned += offlineIncome;

    this.showOfflineIncomePopup(cappedSeconds, offlineIncome);
  },

  /** Menampilkan popup "Selamat datang kembali" lewat UI.showModal(). */
  showOfflineIncomePopup(offlineSeconds, offlineIncome) {
    UI.showModal(`
      <h3 style="margin-bottom: 12px;">Selamat datang kembali! ☕</h3>
      <p class="text-muted" style="margin-bottom: 16px;">
        Selama Anda offline ${Utils.formatTime(offlineSeconds)},
        kedai Anda tetap menghasilkan pendapatan.
      </p>
      <p style="font-size: 1.4rem; font-weight: 700; color: var(--color-success); margin-bottom: 20px;">
        +${Utils.formatMoney(offlineIncome)}
      </p>
      <button class="btn btn--primary" id="modal-close-btn" type="button">
        Ambil &amp; Lanjut Bermain
      </button>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => {
      UI.closeModal();
    });
  },

  /** Inisialisasi awal saat halaman selesai dimuat. */
  init() {
    this.loadSaveAndApplyOfflineIncome();

    // Terapkan preferensi tampilan (dark mode) sesuai save yang dimuat.
    Settings.applyTheme(this.state.settings.darkMode);
    Settings.syncDarkModeToggle();

    Dashboard.render(this.state);
    Shop.render(this.state);
    this.startLoop();
    this.startAutosave();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Game.init();
});
