"use strict";

/**
 * SETTINGS.JS
 * Tanggung jawab modul ini HANYA:
 *   - Save Game (manual)
 *   - Export Save (jadi kode teks yang bisa disalin pemain)
 *   - Import Save (dari kode teks)
 *   - Reset Game (dengan konfirmasi)
 *   - Dark Mode (toggle & terapkan tema)
 *
 * Modul ini TIDAK tahu apa-apa soal upgrade atau game loop.
 * Ia hanya membaca/menulis Game.state dan memanggil Storage.js untuk
 * urusan penyimpanan, serta UI.js untuk urusan tampilan popup/toast.
 */

const Settings = {
  dom: {},

  init() {
    this.cacheDom();
    this.attachEventListeners();
    // Catatan: penerapan tema awal (applyTheme) dipanggil oleh
    // Game.init() SETELAH save dimuat, supaya preferensi dark mode
    // pemain yang tersimpan tidak tertimpa oleh nilai default.
  },

  cacheDom() {
    this.dom = {
      saveBtn: document.getElementById("settings-save-btn"),
      exportBtn: document.getElementById("settings-export-btn"),
      importBtn: document.getElementById("settings-import-btn"),
      resetBtn: document.getElementById("settings-reset-btn"),
      darkModeToggle: document.getElementById("settings-dark-mode-toggle"),
    };
  },

  attachEventListeners() {
    this.dom.saveBtn.addEventListener("click", () => this.handleSaveNow());
    this.dom.exportBtn.addEventListener("click", () => this.handleExport());
    this.dom.importBtn.addEventListener("click", () =>
      this.handleImportPrompt(),
    );
    this.dom.resetBtn.addEventListener("click", () => this.handleResetPrompt());
    this.dom.darkModeToggle.addEventListener("change", (event) => {
      this.handleToggleDarkMode(event.target.checked);
    });
  },

  /* ===================== SAVE GAME (MANUAL) ===================== */

  handleSaveNow() {
    const success = Storage.save(Game.state);
    UI.showToast(
      success ? "Game berhasil disimpan." : "Gagal menyimpan game.",
      success ? "success" : "danger",
    );
  },

  /* ===================== EXPORT SAVE ===================== */

  handleExport() {
    const code = Storage.exportSave(Game.state);

    UI.showModal(`
      <h3 style="margin-bottom: 12px;">Export Save</h3>
      <p class="text-muted" style="margin-bottom: 12px;">
        Salin kode di bawah ini dan simpan baik-baik untuk memindahkan progres Anda.
      </p>
      <textarea id="export-textarea" class="settings-textarea" readonly>${code}</textarea>
      <button class="btn btn--primary" id="export-copy-btn" type="button" style="margin-top: 12px;">
        Copy ke Clipboard
      </button>
    `);

    const textarea = document.getElementById("export-textarea");
    textarea.addEventListener("click", () => textarea.select());

    document.getElementById("export-copy-btn").addEventListener("click", () => {
      textarea.select();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(textarea.value)
          .then(() =>
            UI.showToast("Kode save disalin ke clipboard.", "success"),
          )
          .catch(() =>
            UI.showToast(
              "Gagal menyalin otomatis, silakan salin manual.",
              "danger",
            ),
          );
      } else {
        UI.showToast(
          "Teks sudah terpilih, salin manual dengan Ctrl+C.",
          "success",
        );
      }
    });
  },

  /* ===================== IMPORT SAVE ===================== */

  handleImportPrompt() {
    UI.showModal(`
      <h3 style="margin-bottom: 12px;">Import Save</h3>
      <p class="text-muted" style="margin-bottom: 12px;">
        Tempelkan kode save Anda di bawah ini.
        Progres saat ini akan ditimpa oleh data yang diimpor.
      </p>
      <textarea id="import-textarea" class="settings-textarea" placeholder="Tempel kode save di sini..."></textarea>
      <button class="btn btn--primary" id="import-confirm-btn" type="button" style="margin-top: 12px;">
        Import
      </button>
    `);

    document
      .getElementById("import-confirm-btn")
      .addEventListener("click", () => {
        this.handleImportConfirm();
      });
  },

  handleImportConfirm() {
    const textarea = document.getElementById("import-textarea");
    const code = textarea.value.trim();

    if (!code) {
      UI.showToast("Kode save tidak boleh kosong.", "danger");
      return;
    }

    try {
      const payload = Storage.importSave(code);

      Game.state = mergeWithDefaultState(payload.state);
      Game.recalculateDerivedStats();
      Storage.save(Game.state);

      Dashboard.render(Game.state);
      Shop.render(Game.state);
      this.applyTheme(Game.state.settings.darkMode);
      this.syncDarkModeToggle();

      UI.closeModal();
      UI.showToast("Save berhasil diimpor!", "success");
    } catch (error) {
      console.error("[Settings] Gagal mengimpor save:", error);
      UI.showToast("Kode save tidak valid atau rusak.", "danger");
    }
  },

  /* ===================== RESET GAME ===================== */

  handleResetPrompt() {
    UI.showConfirm({
      title: "Reset Game?",
      message:
        "Semua progres akan dihapus permanen dan tidak bisa dikembalikan. Lanjutkan?",
      confirmLabel: "Reset",
      danger: true,
      onConfirm: () => this.handleResetConfirm(),
    });
  },

  handleResetConfirm() {
    Storage.reset();
    Game.state = createInitialState();
    Game.recalculateDerivedStats();

    Dashboard.render(Game.state);
    Shop.render(Game.state);
    this.applyTheme(Game.state.settings.darkMode);
    this.syncDarkModeToggle();

    UI.showToast("Game telah di-reset ke awal.", "success");
  },

  /* ===================== DARK MODE ===================== */

  handleToggleDarkMode(isDark) {
    Game.state.settings.darkMode = isDark;
    this.applyTheme(isDark);
    Storage.save(Game.state);
  },

  /** Menerapkan/melepas tema gelap ke seluruh halaman lewat atribut data-theme. */
  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  },

  /** Menyamakan posisi toggle switch dengan state.settings.darkMode saat ini. */
  syncDarkModeToggle() {
    this.dom.darkModeToggle.checked = Game.state.settings.darkMode;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Settings.init();
});
