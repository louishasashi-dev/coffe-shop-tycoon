"use strict";

/**
 * UTILS.JS
 * Kumpulan fungsi utilitas umum yang TIDAK bergantung pada
 * state game atau DOM tertentu. Modul lain (game.js, dashboard.js,
 * shop.js, resource.js, kedai.js, dst) memanggil fungsi-fungsi ini,
 * bukan sebaliknya.
 */

const Utils = {
  /**
   * Format angka uang ke format Rupiah.
   * Angka besar disingkat (Jt/M/T) agar tetap mudah dibaca.
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
      { value: 1_000_000_000_000, suffix: "T" },
      { value: 1_000_000_000, suffix: "M" },
      { value: 1_000_000, suffix: "Jt" },
    ];

    for (const unit of units) {
      if (absAmount >= unit.value) {
        const shortValue = (rounded / unit.value).toFixed(2).replace(".", ",");
        return "Rp" + shortValue + " " + unit.suffix;
      }
    }

    return "Rp" + rounded.toLocaleString("id-ID");
  },

  /**
   * Format angka biasa (bukan uang) dengan pemisah ribuan.
   * @param {number} value
   * @returns {string}
   */
  formatNumber(value) {
    return Math.floor(value).toLocaleString("id-ID");
  },

  /**
   * Format detik menjadi string waktu HH:MM:SS.
   * Dipakai untuk waktu bermain (play time).
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
   * Format detik menjadi durasi singkat yang mudah dibaca manusia.
   * Dipakai untuk menampilkan stok bahan baku (mis. "1j 45m").
   * Berbeda dari formatTime() yang selalu menampilkan HH:MM:SS penuh,
   * formatDuration() hanya menampilkan unit yang relevan.
   * @param {number} totalSeconds
   * @returns {string}
   */
  formatDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    if (safe <= 0) return "Habis";

    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
    }
    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}d` : `${minutes}m`;
    }
    return `${seconds}d`;
  },

  /**
   * Format timestamp (ms) menjadi tanggal singkat, mis. "29 Jun 2026".
   * Dipakai oleh kedai.js untuk menampilkan tanggal kedai dibuat.
   * @param {number} timestamp
   * @returns {string}
   */
  formatDateShort(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  },

  /**
   * Membuat ID unik sederhana berbasis waktu + angka acak.
   * Dipakai storage.js untuk memberi ID pada setiap kedai baru.
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /**
   * Angka acak bulat antara min dan max (inklusif).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Membatasi nilai agar selalu berada di antara min dan max.
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Deep clone sederhana untuk objek yang aman di-JSON-kan.
   * @param {object} obj
   * @returns {object}
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
};
