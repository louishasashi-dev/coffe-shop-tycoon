"use strict";

/**
 * SHOP.JS
 * Tanggung jawab modul ini HANYA:
 *   - Daftar upgrade (Equipment, Employee, Business) & harganya
 *   - Membeli upgrade
 *   - Unlock upgrade (upgrade tertentu butuh prasyarat upgrade lain)
 *   - Menghitung total income/employee/shop-level dari seluruh upgrade
 *
 * Modul ini TIDAK mengurus game loop (itu tugas game.js) dan
 * TIDAK mengurus dashboard (itu tugas dashboard.js).
 */

/** Income dasar kedai tanpa upgrade apa pun (kedai kecil baru buka). */
const BASE_INCOME_PER_SECOND = 2;

/** Lama animasi "berhasil" pada kartu (ms), HARUS sinkron dengan durasi animasi di shop.css. */
const BUY_SUCCESS_ANIMATION_MS = 320;

/**
 * Daftar definisi seluruh upgrade yang ada di game.
 * Field "requires" (opsional) artinya upgrade ini terkunci sampai
 * upgrade lain mencapai level tertentu.
 */
const UPGRADE_DEFINITIONS = [
  // ---------- EQUIPMENT ----------
  {
    id: "coffeeMachine",
    category: "equipment",
    name: "Coffee Machine",
    icon: "☕",
    basePrice: 50,
    priceMultiplier: 1.15,
    maxLevel: 25,
    incomePerLevel: 1,
  },
  {
    id: "espressoMachine",
    category: "equipment",
    name: "Espresso Machine",
    icon: "⚡",
    basePrice: 200,
    priceMultiplier: 1.17,
    maxLevel: 25,
    incomePerLevel: 4,
  },
  {
    id: "grinder",
    category: "equipment",
    name: "Grinder",
    icon: "⚙️",
    basePrice: 600,
    priceMultiplier: 1.18,
    maxLevel: 25,
    incomePerLevel: 10,
  },
  {
    id: "premiumBeans",
    category: "equipment",
    name: "Premium Beans",
    icon: "🌱",
    basePrice: 1800,
    priceMultiplier: 1.19,
    maxLevel: 25,
    incomePerLevel: 28,
  },
  {
    id: "milkSteamer",
    category: "equipment",
    name: "Milk Steamer",
    icon: "🥛",
    basePrice: 5000,
    priceMultiplier: 1.2,
    maxLevel: 25,
    incomePerLevel: 75,
  },

  // ---------- EMPLOYEE ----------
  {
    id: "cashier",
    category: "employee",
    name: "Cashier",
    icon: "🧾",
    basePrice: 100,
    priceMultiplier: 1.16,
    maxLevel: 20,
    incomePerLevel: 3,
    employeePerLevel: 1,
  },
  {
    id: "barista",
    category: "employee",
    name: "Barista",
    icon: "🧑‍🍳",
    basePrice: 400,
    priceMultiplier: 1.17,
    maxLevel: 20,
    incomePerLevel: 9,
    employeePerLevel: 1,
  },
  {
    id: "seniorBarista",
    category: "employee",
    name: "Senior Barista",
    icon: "👨‍🍳",
    basePrice: 1200,
    priceMultiplier: 1.18,
    maxLevel: 20,
    incomePerLevel: 24,
    employeePerLevel: 1,
    requires: { id: "barista", level: 5 },
  },
  {
    id: "cleaner",
    category: "employee",
    name: "Cleaner",
    icon: "🧹",
    basePrice: 300,
    priceMultiplier: 1.15,
    maxLevel: 20,
    incomePerLevel: 5,
    employeePerLevel: 1,
  },
  {
    id: "manager",
    category: "employee",
    name: "Manager",
    icon: "🧑‍💼",
    basePrice: 3500,
    priceMultiplier: 1.19,
    maxLevel: 20,
    incomePerLevel: 60,
    employeePerLevel: 1,
    requires: { id: "seniorBarista", level: 5 },
  },

  // ---------- BUSINESS ----------
  {
    id: "decoration",
    category: "business",
    name: "Decoration",
    icon: "🖼️",
    basePrice: 800,
    priceMultiplier: 1.17,
    maxLevel: 15,
    incomePerLevel: 15,
  },
  {
    id: "biggerShop",
    category: "business",
    name: "Bigger Shop",
    icon: "🏠",
    basePrice: 2500,
    priceMultiplier: 1.22,
    maxLevel: 10,
    incomePerLevel: 40,
    shopLevelPerLevel: 1,
    requires: { id: "decoration", level: 5 },
  },
  {
    id: "marketing",
    category: "business",
    name: "Marketing",
    icon: "📣",
    basePrice: 4000,
    priceMultiplier: 1.2,
    maxLevel: 15,
    incomePerLevel: 70,
  },
  {
    id: "delivery",
    category: "business",
    name: "Delivery",
    icon: "🚚",
    basePrice: 9000,
    priceMultiplier: 1.21,
    maxLevel: 15,
    incomePerLevel: 150,
    requires: { id: "marketing", level: 5 },
  },
  {
    id: "franchise",
    category: "business",
    name: "Franchise",
    icon: "🏢",
    basePrice: 25000,
    priceMultiplier: 1.25,
    maxLevel: 10,
    incomePerLevel: 400,
    requires: { id: "biggerShop", level: 5 },
  },
];

const Shop = {
  BASE_INCOME_PER_SECOND,
  dom: {},

  init() {
    this.cacheDom();
    this.attachEventListeners();
    // Catatan: render pertama dipanggil oleh Game.init() setelah
    // save dimuat, supaya kartu upgrade langsung sesuai data tersimpan.
  },

  cacheDom() {
    this.dom = {
      gridEquipment: document.getElementById("shop-grid-equipment"),
      gridEmployee: document.getElementById("shop-grid-employee"),
      gridBusiness: document.getElementById("shop-grid-business"),
    };
  },

  /** Satu listener klik (delegasi) per grid kategori, agar tidak perlu
   *  dipasang ulang setiap kali kartu di-render ulang. */
  attachEventListeners() {
    Object.values(this.dom).forEach((grid) => {
      if (!grid) return;
      grid.addEventListener("click", (event) => this.handleBuyClick(event));
    });
  },

  /* ===================== HELPER DATA ===================== */

  getDefinitionById(id) {
    return UPGRADE_DEFINITIONS.find((def) => def.id === id);
  },

  getDefinitionsByCategory(category) {
    return UPGRADE_DEFINITIONS.filter((def) => def.category === category);
  },

  getUpgradeLevel(state, id) {
    return state.upgrades[id] || 0;
  },

  /** Harga upgrade naik secara eksponensial setiap level. */
  calculatePrice(definition, currentLevel) {
    return Math.round(
      definition.basePrice * Math.pow(definition.priceMultiplier, currentLevel),
    );
  },

  isMaxed(definition, currentLevel) {
    return currentLevel >= definition.maxLevel;
  },

  /** Cek apakah upgrade sudah terbuka (tidak punya prasyarat, atau prasyaratnya terpenuhi). */
  isUnlocked(state, definition) {
    if (!definition.requires) return true;
    const requiredLevel = this.getUpgradeLevel(state, definition.requires.id);
    return requiredLevel >= definition.requires.level;
  },

  canAfford(state, definition, currentLevel, price) {
    return !this.isMaxed(definition, currentLevel) && state.money >= price;
  },

  /* ===================== KALKULASI TURUNAN (DIPAKAI GAME.JS) ===================== */

  /** Total income/detik = income dasar + income dari semua level upgrade yang dimiliki. */
  calculateTotalIncomePerSecond(state) {
    let total = this.BASE_INCOME_PER_SECOND;
    UPGRADE_DEFINITIONS.forEach((def) => {
      const level = this.getUpgradeLevel(state, def.id);
      total += level * def.incomePerLevel;
    });
    return total;
  },

  /** Total karyawan = jumlah level dari semua upgrade kategori employee. */
  calculateTotalEmployees(state) {
    let total = 0;
    this.getDefinitionsByCategory("employee").forEach((def) => {
      const level = this.getUpgradeLevel(state, def.id);
      total += level * (def.employeePerLevel || 0);
    });
    return total;
  },

  /** Level kedai naik setiap kali upgrade "Bigger Shop" dibeli. */
  calculateShopLevel(state) {
    const biggerShopDef = this.getDefinitionById("biggerShop");
    const level = this.getUpgradeLevel(state, "biggerShop");
    return 1 + level * (biggerShopDef.shopLevelPerLevel || 0);
  },

  /* ===================== MEMBELI UPGRADE ===================== */

  /**
   * Mencoba membeli satu level upgrade.
   * Memodifikasi state secara langsung jika berhasil.
   * @param {object} state
   * @param {string} id
   * @returns {{success: boolean, reason?: string, definition?: object, newLevel?: number}}
   */
  buyUpgrade(state, id) {
    const definition = this.getDefinitionById(id);
    if (!definition) return { success: false, reason: "unknown" };

    if (!this.isUnlocked(state, definition)) {
      return { success: false, reason: "locked" };
    }

    const currentLevel = this.getUpgradeLevel(state, id);
    if (this.isMaxed(definition, currentLevel)) {
      return { success: false, reason: "maxed" };
    }

    const price = this.calculatePrice(definition, currentLevel);
    if (state.money < price) {
      return { success: false, reason: "insufficient_funds" };
    }

    state.money -= price;
    state.upgrades[id] = currentLevel + 1;
    state.totalUpgrades += 1;
    state.totalUpgradesPurchased += 1;

    // Recalculate stat turunan supaya dashboard langsung akurat.
    state.incomePerSecond = this.calculateTotalIncomePerSecond(state);
    state.employees = this.calculateTotalEmployees(state);
    state.shopLevel = this.calculateShopLevel(state);

    return { success: true, definition, newLevel: currentLevel + 1 };
  },

  /** Handler klik tombol beli (dipasang lewat event delegation). */
  handleBuyClick(event) {
    const button = event.target.closest("[data-upgrade-id]");
    if (!button || button.disabled) return;

    const id = button.dataset.upgradeId;
    const result = this.buyUpgrade(Game.state, id);

    if (!result.success) {
      if (result.reason === "insufficient_funds") {
        UI.showToast("Uang tidak cukup untuk membeli upgrade ini.", "danger");
      }
      return;
    }

    UI.showToast(
      `${result.definition.name} naik ke level ${result.newLevel}!`,
      "success",
    );
    Dashboard.render(Game.state);

    // Beri animasi "berhasil" sekilas pada kartu yang baru dibeli dulu,
    // baru render ulang grid SETELAH animasi selesai supaya tidak terpotong
    // oleh perubahan level/harga yang langsung mengganti isi kartu.
    const card = button.closest(".upgrade-card");
    if (card) card.classList.add("upgrade-card--success-flash");

    setTimeout(() => {
      this.render(Game.state);
      Storage.save(Game.state); // auto save saat membeli upgrade
    }, BUY_SUCCESS_ANIMATION_MS);
  },

  /* ===================== RENDER ===================== */

  /** Membangun ulang seluruh kartu upgrade di tiap kategori. */
  render(state) {
    this.dom.gridEquipment.innerHTML = this.buildCategoryHtml(
      state,
      "equipment",
    );
    this.dom.gridEmployee.innerHTML = this.buildCategoryHtml(state, "employee");
    this.dom.gridBusiness.innerHTML = this.buildCategoryHtml(state, "business");
  },

  buildCategoryHtml(state, category) {
    return this.getDefinitionsByCategory(category)
      .map((def) => this.buildCardHtml(state, def))
      .join("");
  },

  buildCardHtml(state, definition) {
    const level = this.getUpgradeLevel(state, definition.id);
    const unlocked = this.isUnlocked(state, definition);

    if (!unlocked) {
      return `
        <div class="upgrade-card upgrade-card--locked card">
          <div class="upgrade-card__header">
            <span class="upgrade-card__icon">🔒</span>
            <div>
              <p class="upgrade-card__name">${definition.name}</p>
              <p class="upgrade-card__level text-muted">Terkunci</p>
            </div>
          </div>
          <p class="upgrade-card__requirement">
            Butuh ${this.getDefinitionById(definition.requires.id).name} level ${definition.requires.level}
          </p>
        </div>
      `;
    }

    const maxed = this.isMaxed(definition, level);
    const price = maxed ? null : this.calculatePrice(definition, level);
    const affordable = !maxed && state.money >= price;
    const progressPercent = Math.round((level / definition.maxLevel) * 100);

    return `
      <div class="upgrade-card card ${maxed ? "upgrade-card--maxed" : ""}">
        <div class="upgrade-card__header">
          <span class="upgrade-card__icon">${definition.icon}</span>
          <div>
            <p class="upgrade-card__name">${definition.name}</p>
            <p class="upgrade-card__level">Level ${level} / ${definition.maxLevel}</p>
          </div>
        </div>

        <div class="upgrade-card__progress">
          <div class="upgrade-card__progress-bar" style="width: ${progressPercent}%"></div>
        </div>

        <p class="upgrade-card__income">+${Utils.formatMoney(definition.incomePerLevel)} / detik per level</p>

        <button
          class="btn btn--primary upgrade-card__buy-btn"
          type="button"
          data-upgrade-id="${definition.id}"
          ${maxed || !affordable ? "disabled" : ""}
        >
          ${maxed ? "MAX" : Utils.formatMoney(price)}
        </button>
      </div>
    `;
  },

  /**
   * Dipanggil setiap tick oleh game.js untuk memperbarui status
   * disabled/enabled tombol beli SAJA (tanpa rebuild seluruh HTML),
   * agar ringan dan tidak mengganggu animasi/hover yang sedang berjalan.
   */
  updateAffordability(state) {
    UPGRADE_DEFINITIONS.forEach((definition) => {
      const button = document.querySelector(
        `[data-upgrade-id="${definition.id}"]`,
      );
      if (!button) return;

      const level = this.getUpgradeLevel(state, definition.id);
      if (
        this.isMaxed(definition, level) ||
        !this.isUnlocked(state, definition)
      )
        return;

      const price = this.calculatePrice(definition, level);
      button.disabled = state.money < price;
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Shop.init();
});
