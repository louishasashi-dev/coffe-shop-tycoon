"use strict";

/**
 * DASHBOARD.JS
 * Tanggung jawab modul ini HANYA:
 *   - Menampilkan / memperbarui angka uang
 *   - Menampilkan / memperbarui statistik (karyawan, level, upgrade, dll)
 *   - Progress visual sederhana (animasi pulse saat uang berubah)
 *
 * Modul ini TIDAK mengurus pembelian upgrade (itu tugas shop.js)
 * dan TIDAK mengurus game loop (itu tugas game.js).
 * game.js memanggil Dashboard.render(state) setiap kali state berubah.
 */

const Dashboard = {
  dom: {},

  /** Cache referensi elemen DOM halaman Dashboard. */
  cacheDom() {
    this.dom = {
      totalMoney: document.getElementById("stat-total-money"),
      incomePerSecond: document.getElementById("stat-income-per-second"),
      totalEmployee: document.getElementById("stat-total-employee"),
      shopLevel: document.getElementById("stat-shop-level"),
      totalUpgrade: document.getElementById("stat-total-upgrade"),
      playTime: document.getElementById("stat-play-time"),

      totalCoffeeSold: document.getElementById("stat-total-coffee-sold"),
      totalIncomeEarned: document.getElementById("stat-total-income-earned"),
      totalUpgradesPurchased: document.getElementById(
        "stat-total-upgrades-purchased",
      ),
      totalTimePlayed: document.getElementById("stat-total-time-played"),
    };
  },

  init() {
    this.cacheDom();
  },

  /**
   * Merender seluruh data state ke elemen-elemen Dashboard.
   * Fungsi ini murni "membaca" state, tidak pernah mengubahnya.
   * @param {object} state - state game dari Game.state
   */
  render(state) {
    const { dom } = this;

    dom.totalMoney.textContent = Utils.formatMoney(state.money);
    dom.incomePerSecond.textContent = Utils.formatMoney(state.incomePerSecond);
    dom.totalEmployee.textContent = state.employees;
    dom.shopLevel.textContent = state.shopLevel;
    dom.totalUpgrade.textContent = state.totalUpgrades;
    dom.playTime.textContent = Utils.formatTime(state.playTimeSeconds);

    dom.totalCoffeeSold.textContent = Utils.formatNumber(state.totalCoffeeSold);
    dom.totalIncomeEarned.textContent = Utils.formatMoney(
      state.totalIncomeEarned,
    );
    dom.totalUpgradesPurchased.textContent = state.totalUpgradesPurchased;
    dom.totalTimePlayed.textContent = Utils.formatTime(state.playTimeSeconds);
  },

  /**
   * Memicu animasi "pulse" pada angka Total Uang.
   * Dipanggil game.js setiap tick supaya pemain melihat uangnya bertambah.
   */
  pulseMoney() {
    UI.pulseElement(this.dom.totalMoney);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Dashboard.init();
});
