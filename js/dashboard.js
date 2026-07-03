"use strict";

/**
 * DASHBOARD.JS
 * Tanggung jawab modul ini HANYA:
 *   - Menampilkan / memperbarui statistik kedai yang sedang aktif
 *     (income/detik, karyawan, level, total upgrade, waktu bermain,
 *     dan panel statistik detail)
 *
 * CATATAN: saldo wallet (saldo bersama semua kedai) TIDAK lagi
 * dikelola di sini -- itu sepenuhnya tanggung jawab wallet.js,
 * walaupun tampil di kartu yang sama (dashboard-hero) di index.html.
 * Dashboard.js hanya mengisi bagian "income per detik" di kartu itu.
 */

const Dashboard = {
  dom: {},

  cacheDom() {
    this.dom = {
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
   * Merender seluruh statistik kedai aktif ke elemen-elemen Dashboard.
   * Fungsi ini murni "membaca" state, tidak pernah mengubahnya.
   * @param {object} state - state kedai aktif dari Game.state
   */
  render(state) {
    const { dom } = this;

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
};

document.addEventListener("DOMContentLoaded", () => {
  Dashboard.init();
});
