"use strict";

/**
 * UI.JS
 * Tanggung jawab modul ini:
 *   - Tab switching (ganti halaman Dashboard / Shop / Settings)
 *   - Toast (notifikasi singkat)
 *   - Modal / Popup generik (termasuk modal konfirmasi)
 *   - Helper update UI generik (pulse animation, dll)
 *
 * Modul ini TIDAK tahu apa-apa soal state game, upgrade, atau uang.
 * Modul lain (game.js, dashboard.js, shop.js, settings.js) yang
 * memanggil fungsi-fungsi di sini, bukan sebaliknya.
 */

const UI = {
  dom: {},

  /** Cache referensi elemen DOM yang dipakai berulang. */
  cacheDom() {
    this.dom = {
      toastContainer: document.getElementById("toast-container"),
      modalOverlay: document.getElementById("modal-overlay"),
      modalContent: document.getElementById("modal-content"),
      navTabs: document.querySelectorAll(".nav-tab"),
      pages: document.querySelectorAll(".page"),
    };
  },

  init() {
    this.cacheDom();
    this.initTabs();
    this.initModalDismissListeners();
  },

  /* ===================== TAB SWITCHING ===================== */

  /** Memasang event klik pada setiap tombol nav-tab. */
  initTabs() {
    this.dom.navTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        this.switchPage(tab.dataset.page);
      });
    });
  },

  /**
   * Menampilkan halaman sesuai nama, menyembunyikan sisanya,
   * dan menandai tombol nav yang aktif.
   * Juga mengirim custom event "page:change" supaya modul lain
   * (misalnya shop.js nanti) bisa bereaksi saat halamannya dibuka,
   * tanpa ui.js perlu tahu apa-apa soal modul tersebut.
   * @param {string} pageName
   */
  switchPage(pageName) {
    this.dom.navTabs.forEach((tab) => {
      tab.classList.toggle("nav-tab--active", tab.dataset.page === pageName);
    });

    this.dom.pages.forEach((page) => {
      page.hidden = page.dataset.page !== pageName;
    });

    document.dispatchEvent(
      new CustomEvent("page:change", { detail: { page: pageName } }),
    );
  },

  /* ===================== TOAST ===================== */

  /**
   * Menampilkan notifikasi toast singkat di pojok kanan bawah.
   * @param {string} message
   * @param {"success"|"danger"} type
   * @param {number} duration - durasi tampil dalam ms
   */
  showToast(message, type = "success", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast--leaving");
      toast.addEventListener("animationend", () => toast.remove(), {
        once: true,
      });
    }, duration);
  },

  /* ===================== MODAL / POPUP ===================== */

  /**
   * Menampilkan modal dengan HTML bebas di dalamnya.
   * Dipakai untuk popup khusus seperti "Selamat datang kembali".
   * @param {string} html
   */
  showModal(html) {
    this.dom.modalContent.innerHTML = html;
    this.dom.modalOverlay.hidden = false;
  },

  /** Menutup modal yang sedang tampil. */
  closeModal() {
    this.dom.modalOverlay.hidden = true;
    this.dom.modalContent.innerHTML = "";
  },

  /**
   * Modal konfirmasi siap pakai (Ya/Batal).
   * Akan banyak dipakai settings.js (Reset Game) & shop.js nanti.
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmLabel]
   * @param {string} [options.cancelLabel]
   * @param {boolean} [options.danger] - true untuk aksi berbahaya (mis. reset)
   * @param {Function} options.onConfirm
   */
  showConfirm({
    title,
    message,
    confirmLabel = "Ya",
    cancelLabel = "Batal",
    danger = false,
    onConfirm,
  }) {
    const confirmButtonClass = danger ? "btn--danger" : "btn--primary";

    this.showModal(`
      <h3 style="margin-bottom: 12px;">${title}</h3>
      <p class="text-muted" style="margin-bottom: 20px;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn btn--ghost" id="ui-confirm-cancel" type="button">${cancelLabel}</button>
        <button class="btn ${confirmButtonClass}" id="ui-confirm-ok" type="button">${confirmLabel}</button>
      </div>
    `);

    document
      .getElementById("ui-confirm-cancel")
      .addEventListener("click", () => {
        this.closeModal();
      });

    document.getElementById("ui-confirm-ok").addEventListener("click", () => {
      this.closeModal();
      if (typeof onConfirm === "function") onConfirm();
    });
  },

  /** Modal tertutup saat klik area gelap di luar konten, atau tekan Escape. */
  initModalDismissListeners() {
    this.dom.modalOverlay.addEventListener("click", (event) => {
      if (event.target === this.dom.modalOverlay) {
        this.closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.dom.modalOverlay.hidden) {
        this.closeModal();
      }
    });
  },

  /* ===================== HELPER UPDATE UI ===================== */

  /**
   * Memicu ulang animasi "pulse" pada sebuah elemen.
   * Trik: hapus class lalu paksa reflow sebelum menambah lagi,
   * supaya animasi CSS bisa di-restart walau DOM tidak berubah.
   * @param {HTMLElement} element
   */
  pulseElement(element) {
    if (!element) return;
    element.classList.remove("value-pulse");
    void element.offsetWidth; // force reflow
    element.classList.add("value-pulse");
  },
};

document.addEventListener("DOMContentLoaded", () => {
  UI.init();
});
