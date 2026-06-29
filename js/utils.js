"use strict";

/**
 * UTILS.JS
 * Kumpulan fungsi utilitas umum yang TIDAK bergantung pada
 * state game atau DOM tertentu. Modul lain (game.js, dashboard.js,
 * shop.js, dst) memanggil fungsi-fungsi ini, bukan sebaliknya.
 */

const Utils = {
  /**
   * Format angka uang ke format Rupiah.
   * Angka kecil ditampilkan utuh dengan pemisah titik (Rp1.234),
   * angka besar otomatis disingkat (Jt/M/T) agar tetap mudah dibaca
   * saat income sudah sangat besar di akhir permainan.
   * @param {number} amount
   * @returns {string}
   */
  formatMoney(amount) {
    const rounded = Math.floor(amount);
    const absAmount = Math.abs(rounded);

    if (absAmount < 1_000_000) {
      return "Rp" + rounded.toLocaleString("id-ID");
    }

    const units = [
      { value: 1_000_000_000_000, suffix: "T" }, // Triliun
      { value: 1_000_000_000, suffix: "M" }, // Miliar
      { value: 1_000_000, suffix: "Jt" }, // Juta
    ];

    for (const unit of units) {
      if (absAmount >= unit.value) {
        const shortValue = (rounded / unit.value).toFixed(2).replace(".", ",");
        return "Rp" + shortValue + " " + unit.suffix;
      }
    }

    return "Rp" + rounded.toLocaleString("id-ID"); // fallback (seharusnya tidak tercapai)
  },

  /**
   * Format angka biasa (bukan uang) dengan pemisah ribuan.
   * Dipakai untuk statistik seperti "Total Kopi Terjual".
   * @param {number} value
   * @returns {string}
   */
  formatNumber(value) {
    return Math.floor(value).toLocaleString("id-ID");
  },

  /**
   * Format detik menjadi string waktu HH:MM:SS.
   * @param {number} totalSeconds
   * @returns {string}
   */
  formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    const pad = (num) => String(num).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  },

  /**
   * Angka acak bulat antara min dan max (inklusif).
   * Disiapkan untuk fitur acak di tahap-tahap berikutnya
   * (misalnya event pelanggan acak).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Membatasi nilai agar selalu berada di antara min dan max.
   * Akan dipakai shop.js untuk membatasi level upgrade ke maksimum.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Deep clone sederhana untuk objek yang aman di-JSON-kan
   * (state game, daftar upgrade, dll). Dipakai storage.js & shop.js
   * agar tidak tidak sengaja memodifikasi objek asli secara referensi.
   * @param {object} obj
   * @returns {object}
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
};
