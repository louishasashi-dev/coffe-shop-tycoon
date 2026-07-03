"use strict";

/**
 * WALLET.JS
 * Tanggung jawab modul ini HANYA:
 *   - Memegang & menampilkan saldo wallet (rekening bersama semua kedai)
 *   - Menambah saldo (income dari kedai yang sedang aktif)
 *   - Mengurangi saldo (pembelian upgrade, dan nanti: isi bahan baku,
 *     buka kedai baru di tahap-tahap berikutnya)
 *   - Menyimpan & memuat saldo lewat Storage.js
 *
 * PENTING: Wallet TIDAK terikat ke satu kedai. Semua kedai menyetor
 * pendapatannya ke sini, dan semua pengeluaran diambil dari sini juga --
 * bukan dari state masing-masing kedai. Modul ini tidak tahu apa-apa
 * soal upgrade, kedai, atau game loop.
 */

const Wallet = {
  balance: 0,
  dom: {},

  init() {
    this.cacheDom();
    this.balance = Storage.getWalletBalance();
    this.render();
  },

  /**
   * Saldo ditampilkan di beberapa tempat sekaligus supaya selalu
   * terlihat: hero card Dashboard, widget kecil di sidebar (terlihat
   * di tab apa pun), dan banner di screen "Kedai Saya".
   */
  cacheDom() {
    this.dom = {
      hero: document.getElementById("wallet-balance-hero"),
      sidebar: document.getElementById("wallet-balance-sidebar"),
      selector: document.getElementById("wallet-balance-selector"),
    };
  },

  /** Menampilkan saldo terbaru ke semua elemen yang merujuk ke wallet. */
  render() {
    const formatted = Utils.formatMoney(this.balance);
    Object.values(this.dom).forEach((el) => {
      if (el) el.textContent = formatted;
    });
  },

  /** Memicu animasi "pulse" pada tampilan saldo di hero Dashboard. */
  pulse() {
    UI.pulseElement(this.dom.hero);
  },

  /** @param {number} amount @returns {boolean} true jika saldo mencukupi. */
  canAfford(amount) {
    return this.balance >= amount;
  },

  /**
   * Menambah saldo (mis. income idle/offline dari kedai aktif).
   * TIDAK langsung disimpan ke localStorage tiap kali dipanggil
   * (dipanggil setiap detik oleh game.js), supaya tidak membebani
   * penyimpanan. Penyimpanan permanen terjadi lewat autosave berkala
   * atau saat sesi berakhir (lihat Game.saveNow() & Game.endSession()).
   * @param {number} amount
   */
  add(amount) {
    this.balance += amount;
    this.render();
  },

  /**
   * Mengurangi saldo untuk sebuah pembelian. Langsung disimpan ke
   * localStorage karena ini aksi eksplisit pemain (sama seperti aturan
   * lama: pembelian upgrade langsung memicu auto save).
   * @param {number} amount
   * @returns {boolean} true jika berhasil (saldo cukup)
   */
  spend(amount) {
    if (!this.canAfford(amount)) return false;

    this.balance -= amount;
    this.render();
    this.persist();
    return true;
  },

  /** Menyimpan saldo saat ini ke localStorage lewat Storage.js. */
  persist() {
    Storage.saveWalletBalance(this.balance);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Wallet.init();
});
