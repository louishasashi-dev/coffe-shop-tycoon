"use strict";

/**
 * STORAGE.JS
 * Tanggung jawab modul ini HANYA:
 *   - Save Game   -> Storage.save(state)
 *   - Load Game   -> Storage.load()
 *   - Reset Save  -> Storage.reset()
 *   - Export/Import save sebagai string (dipakai settings.js nanti)
 *
 * Modul ini tidak tahu apa-apa soal game loop, upgrade, atau tampilan.
 * Ia hanya menyimpan & mengambil objek "state" apa adanya.
 */

const Storage = {
  SAVE_KEY: "coffeeShopTycoon_save",
  SAVE_VERSION: 1,

  /**
   * Menyimpan state game ke localStorage, beserta timestamp
   * (dipakai game.js nanti untuk menghitung offline income).
   * @param {object} state
   * @returns {boolean} true jika berhasil disimpan
   */
  save(state) {
    try {
      const payload = {
        version: this.SAVE_VERSION,
        lastSaveTimestamp: Date.now(),
        state,
      };
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("[Storage] Gagal menyimpan game:", error);
      return false;
    }
  },

  /**
   * Memuat data save dari localStorage.
   * @returns {{version: number, lastSaveTimestamp: number, state: object} | null}
   */
  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return null;

      const payload = JSON.parse(raw);

      if (!payload || typeof payload.state !== "object") {
        console.warn("[Storage] Data save tidak valid, diabaikan.");
        return null;
      }

      return payload;
    } catch (error) {
      console.error("[Storage] Gagal memuat save:", error);
      return null;
    }
  },

  /**
   * Menghapus data save dari localStorage.
   * @returns {boolean} true jika berhasil
   */
  reset() {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      return true;
    } catch (error) {
      console.error("[Storage] Gagal mereset save:", error);
      return false;
    }
  },

  /**
   * Mengubah state menjadi string yang bisa di-copy pemain (Export Save).
   * Dikodekan base64 supaya ringkas & tidak mudah diedit manual.
   * @param {object} state
   * @returns {string}
   */
  exportSave(state) {
    const payload = {
      version: this.SAVE_VERSION,
      lastSaveTimestamp: Date.now(),
      state,
    };
    const json = JSON.stringify(payload);
    return btoa(encodeURIComponent(json));
  },

  /**
   * Mengubah string hasil export kembali menjadi data save (Import Save).
   * @param {string} encodedString
   * @returns {{version: number, lastSaveTimestamp: number, state: object}}
   * @throws {Error} jika string tidak valid / rusak
   */
  importSave(encodedString) {
    const json = decodeURIComponent(atob(encodedString.trim()));
    const payload = JSON.parse(json);

    if (!payload || typeof payload.state !== "object") {
      throw new Error("Format save tidak valid.");
    }

    return payload;
  },
};
