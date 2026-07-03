"use strict";

/**
 * STORAGE.JS
 * Tanggung jawab modul ini HANYA membaca/menulis data ke localStorage.
 * Ada DUA jenis data yang dikelola, masing-masing di key terpisah:
 *   1. Daftar kedai (banyak record, satu per kedai)
 *   2. Wallet (satu saldo bersama, dipakai semua kedai)
 *
 * Modul ini tidak tahu apa-apa soal bentuk "state" game itu sendiri
 * (upgrade, income, dll) — ia hanya menyimpan & mengembalikan apa adanya.
 */

const Storage = {
  SHOPS_KEY: "coffeeShopTycoon_kedai_v1",
  WALLET_KEY: "coffeeShopTycoon_wallet_v1",
  SAVE_VERSION: 1,

  /** Saldo awal yang diberikan SATU KALI saat pemain pertama kali main. */
  DEFAULT_WALLET_BALANCE: 500,

  /* ===================== DATA KEDAI (MULTI-RECORD) ===================== */

  /** Membaca seluruh data mentah kedai dari localStorage. Selalu mengembalikan struktur valid. */
  _readAllShops() {
    try {
      const raw = localStorage.getItem(this.SHOPS_KEY);
      if (!raw) return { version: this.SAVE_VERSION, shops: {} };

      const data = JSON.parse(raw);
      if (!data || typeof data.shops !== "object") {
        console.warn(
          "[Storage] Struktur data kedai tidak valid, dimulai dari kosong.",
        );
        return { version: this.SAVE_VERSION, shops: {} };
      }
      return data;
    } catch (error) {
      console.error("[Storage] Gagal membaca data kedai:", error);
      return { version: this.SAVE_VERSION, shops: {} };
    }
  },

  /** Menulis seluruh data mentah kedai ke localStorage. */
  _writeAllShops(data) {
    try {
      localStorage.setItem(this.SHOPS_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("[Storage] Gagal menulis data kedai:", error);
      return false;
    }
  },

  /**
   * Mengambil seluruh kedai milik pemain, diurutkan dari yang
   * terakhir dimainkan (paling baru disimpan duluan).
   * @returns {Array<object>}
   */
  getAllShops() {
    const data = this._readAllShops();
    return Object.values(data.shops)
      .filter((shop) => shop && shop.state) // buang record rusak/tidak lengkap
      .sort((a, b) => b.lastSaveTimestamp - a.lastSaveTimestamp);
  },

  /**
   * Mengambil satu kedai berdasarkan ID.
   * @param {string} id
   * @returns {object|null}
   */
  getShop(id) {
    const data = this._readAllShops();
    return data.shops[id] || null;
  },

  /**
   * Membuat kedai baru dan langsung menyimpannya.
   * @param {string} name - nama kedai dari input pemain
   * @param {object} initialState - state awal (dari Game.createInitialState())
   * @returns {object} record kedai yang baru dibuat
   */
  createShop(name, initialState) {
    const data = this._readAllShops();
    const now = Date.now();

    const record = {
      id: Utils.generateId(),
      name,
      createdAt: now,
      lastSaveTimestamp: now,
      state: initialState,
    };

    data.shops[record.id] = record;
    this._writeAllShops(data);

    return record;
  },

  /**
   * Memperbarui state & waktu save terakhir milik satu kedai.
   * @param {string} id
   * @param {object} state
   * @returns {boolean} true jika berhasil
   */
  saveShopState(id, state) {
    const data = this._readAllShops();
    if (!data.shops[id]) {
      console.warn(
        `[Storage] Kedai dengan id "${id}" tidak ditemukan, gagal save.`,
      );
      return false;
    }

    data.shops[id].state = state;
    data.shops[id].lastSaveTimestamp = Date.now();

    return this._writeAllShops(data);
  },

  /**
   * Menghapus satu kedai secara permanen.
   * @param {string} id
   * @returns {boolean} true jika berhasil
   */
  deleteShop(id) {
    const data = this._readAllShops();
    delete data.shops[id];
    return this._writeAllShops(data);
  },

  /* ===================== WALLET (SALDO BERSAMA) ===================== */

  /**
   * Mengambil saldo wallet saat ini. Jika belum pernah ada (pemain baru
   * pertama kali membuka game), wallet otomatis diinisialisasi dengan
   * DEFAULT_WALLET_BALANCE dan langsung disimpan.
   * @returns {number}
   */
  getWalletBalance() {
    try {
      const raw = localStorage.getItem(this.WALLET_KEY);

      if (!raw) {
        this.saveWalletBalance(this.DEFAULT_WALLET_BALANCE);
        return this.DEFAULT_WALLET_BALANCE;
      }

      const data = JSON.parse(raw);
      if (
        !data ||
        typeof data.balance !== "number" ||
        Number.isNaN(data.balance)
      ) {
        console.warn("[Storage] Data wallet tidak valid, direset ke 0.");
        return 0;
      }

      return data.balance;
    } catch (error) {
      console.error("[Storage] Gagal membaca wallet:", error);
      return 0;
    }
  },

  /**
   * Menyimpan saldo wallet ke localStorage.
   * @param {number} balance
   * @returns {boolean} true jika berhasil
   */
  saveWalletBalance(balance) {
    try {
      localStorage.setItem(
        this.WALLET_KEY,
        JSON.stringify({ balance, lastUpdated: Date.now() }),
      );
      return true;
    } catch (error) {
      console.error("[Storage] Gagal menyimpan wallet:", error);
      return false;
    }
  },

  /* ===================== EXPORT / IMPORT (per kedai aktif) ===================== */

  /**
   * Mengubah satu state kedai menjadi string yang bisa di-copy pemain.
   * CATATAN: hanya berisi progres kedai (upgrade, statistik, settings),
   * TIDAK termasuk saldo wallet -- wallet bersifat global, bukan milik
   * satu kedai, sehingga sengaja tidak ikut diekspor/diimpor.
   * @param {object} state
   * @returns {string}
   */
  exportSave(state) {
    const payload = {
      version: this.SAVE_VERSION,
      exportedAt: Date.now(),
      state,
    };
    const json = JSON.stringify(payload);
    return btoa(encodeURIComponent(json));
  },

  /**
   * Mengubah string hasil export kembali menjadi data state.
   * @param {string} encodedString
   * @returns {{version: number, exportedAt: number, state: object}}
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
