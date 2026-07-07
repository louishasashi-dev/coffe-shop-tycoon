"use strict";

/**
 * SHOP.JS
 * Tanggung jawab modul ini HANYA:
 *   - Daftar upgrade (Equipment, Employee, Business) & harganya
 *   - Membeli upgrade (mengambil dana dari Wallet)
 *   - Unlock upgrade (prasyarat upgrade lain)
 *   - Menghitung total income/employee/shop-level dari seluruh upgrade
 *
 * SEJAK TAHAP 3: tambahan isFullyMaxed(state) yang dipakai kedai.js
 * untuk memvalidasi syarat "semua upgrade harus MAX" sebelum
 * pemain boleh membuka kedai baru.
 */

const BASE_INCOME_PER_SECOND = 2;
const BUY_SUCCESS_ANIMATION_MS = 320;

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
  {
    id: "cakemenu",
    category: "equipment",
    name: "Cake",
    icon: "🧁",
    basePrice: 5500,
    priceMultiplier: 1.3,
    maxLevel: 25,
    incomePerLevel: 80,
  },
  {
    id: "GrapeTasted",
    category: "equipment",
    name: "Grape Taste",
    icon: "🍇",
    basePrice: 10000,
    priceMultiplier: 1.3,
    maxLevel: 25,
    incomePerLevel: 85,
  },
  {
    id: "CookiesMenu",
    category: "equipment",
    name: "Cookies",
    icon: "🍪",
    basePrice: 12000,
    priceMultiplier: 1.3,
    maxLevel: 25,
    incomePerLevel: 90,
    requires: { id: "milkSteamer", level: 15 },
  },
  {
    id: "coldBrewStation",
    category: "equipment",
    name: "Cold Brew Station",
    icon: "🧊",
    basePrice: 18000,
    priceMultiplier: 1.32,
    maxLevel: 25,
    incomePerLevel: 120,
    requires: { id: "CookiesMenu", level: 10 },
  },
  {
    id: "blenderStation",
    category: "equipment",
    name: "Blender Station",
    icon: "🥤",
    basePrice: 25000,
    priceMultiplier: 1.33,
    maxLevel: 25,
    incomePerLevel: 170,
    requires: { id: "coldBrewStation", level: 5 },
  },
  {
    id: "pastryOven",
    category: "equipment",
    name: "Pastry Oven",
    icon: "🔥",
    basePrice: 35000,
    priceMultiplier: 1.34,
    maxLevel: 25,
    incomePerLevel: 240,
    requires: { id: "blenderStation", level: 5 },
  },
  {
    id: "iceMaker",
    category: "equipment",
    name: "Ice Maker",
    icon: "🧊",
    basePrice: 50000,
    priceMultiplier: 1.35,
    maxLevel: 25,
    incomePerLevel: 330,
    requires: { id: "pastryOven", level: 5 },
  },
  {
    id: "beanRoaster",
    category: "equipment",
    name: "Bean Roaster",
    icon: "🔥",
    basePrice: 70000,
    priceMultiplier: 1.36,
    maxLevel: 25,
    incomePerLevel: 450,
    requires: { id: "iceMaker", level: 5 },
  },
  {
    id: "automaticBrewer",
    category: "equipment",
    name: "Auto Brewer",
    icon: "🤖",
    basePrice: 95000,
    priceMultiplier: 1.37,
    maxLevel: 25,
    incomePerLevel: 600,
    requires: { id: "beanRoaster", level: 5 },
  },
  {
    id: "nitroCoffee",
    category: "equipment",
    name: "Nitro Coffee",
    icon: "🥃",
    basePrice: 130000,
    priceMultiplier: 1.38,
    maxLevel: 25,
    incomePerLevel: 800,
    requires: { id: "automaticBrewer", level: 5 },
  },
  {
    id: "robotBarista",
    category: "equipment",
    name: "Robot Barista",
    icon: "🤖",
    basePrice: 180000,
    priceMultiplier: 1.4,
    maxLevel: 25,
    incomePerLevel: 1100,
    requires: { id: "nitroCoffee", level: 5 },
  },
  {
    id: "signatureLab",
    category: "equipment",
    name: "Signature Lab",
    icon: "🧪",
    basePrice: 250000,
    priceMultiplier: 1.42,
    maxLevel: 25,
    incomePerLevel: 1500,
    requires: { id: "robotBarista", level: 5 },
  },
  {
    id: "smartKitchen",
    category: "equipment",
    name: "Smart Kitchen",
    icon: "🏭",
    basePrice: 350000,
    priceMultiplier: 1.45,
    maxLevel: 25,
    incomePerLevel: 2100,
    requires: { id: "signatureLab", level: 5 },
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
  {
    id: "accountant",
    category: "employee",
    name: "Accountant",
    icon: "💳",
    basePrice: 4500,
    priceMultiplier: 1.19,
    maxLevel: 20,
    incomePerLevel: 60,
    employeePerLevel: 1,
    requires: { id: "manager", level: 5 },
  },
  {
    id: "director",
    category: "employee",
    name: "Director",
    icon: "👩‍💼",
    basePrice: 12500,
    priceMultiplier: 1.5,
    maxLevel: 20,
    incomePerLevel: 180,
    employeePerLevel: 1,
    requires: { id: "manager", level: 15 },
  },
  {
    id: "trainner",
    category: "employee",
    name: "Trainer",
    icon: "🎓",
    basePrice: 15000,
    priceMultiplier: 1.5,
    maxLevel: 20,
    incomePerLevel: 180,
    employeePerLevel: 1,
    requires: { id: "manager", level: 15 },
  },
  {
    id: "Chef",
    category: "employee",
    name: "Chef",
    icon: "👨‍🍳",
    basePrice: 25000,
    priceMultiplier: 1.6,
    maxLevel: 30,
    incomePerLevel: 250,
    employeePerLevel: 1,
    requires: { id: "trainner", level: 20 },
  },
  {
    id: "headChef",
    category: "employee",
    name: "Head Chef",
    icon: "👨‍🍳",
    basePrice: 40000,
    priceMultiplier: 1.6,
    maxLevel: 30,
    incomePerLevel: 350,
    employeePerLevel: 1,
    requires: { id: "Chef", level: 10 },
  },
  {
    id: "coffeeExpert",
    category: "employee",
    name: "Coffee Expert",
    icon: "☕",
    basePrice: 60000,
    priceMultiplier: 1.62,
    maxLevel: 30,
    incomePerLevel: 500,
    employeePerLevel: 1,
    requires: { id: "headChef", level: 5 },
  },
  {
    id: "storeSupervisor",
    category: "employee",
    name: "Supervisor",
    icon: "📋",
    basePrice: 85000,
    priceMultiplier: 1.64,
    maxLevel: 30,
    incomePerLevel: 700,
    employeePerLevel: 1,
    requires: { id: "coffeeExpert", level: 5 },
  },
  {
    id: "branchManager",
    category: "employee",
    name: "Branch Manager",
    icon: "🏢",
    basePrice: 120000,
    priceMultiplier: 1.66,
    maxLevel: 30,
    incomePerLevel: 950,
    employeePerLevel: 1,
    requires: { id: "storeSupervisor", level: 5 },
  },
  {
    id: "operationsManager",
    category: "employee",
    name: "Operations Manager",
    icon: "📈",
    basePrice: 170000,
    priceMultiplier: 1.68,
    maxLevel: 30,
    incomePerLevel: 1300,
    employeePerLevel: 1,
    requires: { id: "branchManager", level: 5 },
  },
  {
    id: "regionalManager",
    category: "employee",
    name: "Regional Manager",
    icon: "🌍",
    basePrice: 240000,
    priceMultiplier: 1.7,
    maxLevel: 30,
    incomePerLevel: 1800,
    employeePerLevel: 1,
    requires: { id: "operationsManager", level: 5 },
  },
  {
    id: "marketingDirector",
    category: "employee",
    name: "Marketing Director",
    icon: "📣",
    basePrice: 330000,
    priceMultiplier: 1.72,
    maxLevel: 30,
    incomePerLevel: 2500,
    employeePerLevel: 1,
    requires: { id: "regionalManager", level: 5 },
  },
  {
    id: "coo",
    category: "employee",
    name: "COO",
    icon: "💼",
    basePrice: 450000,
    priceMultiplier: 1.75,
    maxLevel: 30,
    incomePerLevel: 3400,
    employeePerLevel: 1,
    requires: { id: "marketingDirector", level: 5 },
  },
  {
    id: "ceo",
    category: "employee",
    name: "CEO",
    icon: "👔",
    basePrice: 600000,
    priceMultiplier: 1.78,
    maxLevel: 30,
    incomePerLevel: 4600,
    employeePerLevel: 1,
    requires: { id: "coo", level: 5 },
  },
  {
    id: "boardDirectors",
    category: "employee",
    name: "Board Directors",
    icon: "🏛️",
    basePrice: 850000,
    priceMultiplier: 1.8,
    maxLevel: 30,
    incomePerLevel: 6200,
    employeePerLevel: 1,
    requires: { id: "ceo", level: 5 },
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
    id: "freewifi",
    category: "business",
    name: "Free Wifi",
    icon: "🛜",
    basePrice: 1200,
    priceMultiplier: 1.19,
    maxLevel: 15,
    incomePerLevel: 25,
  },
  {
    id: "biggerShop",
    category: "business",
    name: "Bigger Shop",
    icon: "🏠",
    basePrice: 2500,
    priceMultiplier: 1.22,
    maxLevel: 15,
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
  {
    id: "LiveMusic",
    category: "business",
    name: "Live Music",
    icon: "👩‍🎤",
    basePrice: 35000,
    priceMultiplier: 1.25,
    maxLevel: 20,
    incomePerLevel: 500,
    requires: { id: "biggerShop", level: 15 },
  },
  {
    id: "mobileApp",
    category: "business",
    name: "Mobile App",
    icon: "📱",
    basePrice: 50000,
    priceMultiplier: 1.27,
    maxLevel: 20,
    incomePerLevel: 700,
    requires: { id: "LiveMusic", level: 5 },
  },
  {
    id: "loyaltyProgram",
    category: "business",
    name: "Loyalty Program",
    icon: "🎁",
    basePrice: 70000,
    priceMultiplier: 1.28,
    maxLevel: 20,
    incomePerLevel: 950,
    requires: { id: "mobileApp", level: 5 },
  },
  {
    id: "onlineOrdering",
    category: "business",
    name: "Online Ordering",
    icon: "🛒",
    basePrice: 100000,
    priceMultiplier: 1.29,
    maxLevel: 20,
    incomePerLevel: 1300,
    requires: { id: "loyaltyProgram", level: 5 },
  },
  {
    id: "driveThru",
    category: "business",
    name: "Drive Thru",
    icon: "🚗",
    basePrice: 140000,
    priceMultiplier: 1.3,
    maxLevel: 20,
    incomePerLevel: 1800,
    requires: { id: "onlineOrdering", level: 5 },
  },
  {
    id: "vipLounge",
    category: "business",
    name: "VIP Lounge",
    icon: "🛋️",
    basePrice: 200000,
    priceMultiplier: 1.31,
    maxLevel: 20,
    incomePerLevel: 2500,
    requires: { id: "driveThru", level: 5 },
  },
  {
    id: "coffeeAcademy",
    category: "business",
    name: "Coffee Academy",
    icon: "🎓",
    basePrice: 280000,
    priceMultiplier: 1.32,
    maxLevel: 20,
    incomePerLevel: 3400,
    requires: { id: "vipLounge", level: 5 },
  },
  {
    id: "internationalBeans",
    category: "business",
    name: "Import Beans",
    icon: "🌎",
    basePrice: 390000,
    priceMultiplier: 1.33,
    maxLevel: 20,
    incomePerLevel: 4600,
    requires: { id: "coffeeAcademy", level: 5 },
  },
  {
    id: "coffeeFactory",
    category: "business",
    name: "Coffee Factory",
    icon: "🏭",
    basePrice: 550000,
    priceMultiplier: 1.35,
    maxLevel: 20,
    incomePerLevel: 6200,
    requires: { id: "internationalBeans", level: 5 },
  },
  {
    id: "globalFranchise",
    category: "business",
    name: "Global Franchise",
    icon: "🌐",
    basePrice: 800000,
    priceMultiplier: 1.37,
    maxLevel: 20,
    incomePerLevel: 8500,
    requires: { id: "coffeeFactory", level: 5 },
  },
  {
    id: "coffeeEmpire",
    category: "business",
    name: "Coffee Empire",
    icon: "👑",
    basePrice: 1200000,
    priceMultiplier: 1.4,
    maxLevel: 20,
    incomePerLevel: 12000,
    requires: { id: "globalFranchise", level: 5 },
  },
  {
    id: "Sponsored",
    category: "business",
    name: "Sponsored",
    icon: "💵",
    basePrice: 150000000,
    priceMultiplier: 1.9,
    maxLevel: 3,
    incomePerLevel: 500000,
  },
];

const Shop = {
  BASE_INCOME_PER_SECOND,
  dom: {},

  init() {
    this.cacheDom();
    this.attachEventListeners();
  },

  cacheDom() {
    this.dom = {
      gridEquipment: document.getElementById("shop-grid-equipment"),
      gridEmployee: document.getElementById("shop-grid-employee"),
      gridBusiness: document.getElementById("shop-grid-business"),
    };
  },

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

  calculatePrice(definition, currentLevel) {
    return Math.round(
      definition.basePrice * Math.pow(definition.priceMultiplier, currentLevel),
    );
  },

  isMaxed(definition, currentLevel) {
    return currentLevel >= definition.maxLevel;
  },

  isUnlocked(state, definition) {
    if (!definition.requires) return true;
    return (
      this.getUpgradeLevel(state, definition.requires.id) >=
      definition.requires.level
    );
  },

  /* ===================== KALKULASI TURUNAN ===================== */

  calculateTotalIncomePerSecond(state) {
    let total = this.BASE_INCOME_PER_SECOND;
    UPGRADE_DEFINITIONS.forEach((def) => {
      total += this.getUpgradeLevel(state, def.id) * def.incomePerLevel;
    });
    return total;
  },

  calculateTotalEmployees(state) {
    let total = 0;
    this.getDefinitionsByCategory("employee").forEach((def) => {
      total +=
        this.getUpgradeLevel(state, def.id) * (def.employeePerLevel || 0);
    });
    return total;
  },

  calculateShopLevel(state) {
    const def = this.getDefinitionById("biggerShop");
    return (
      1 +
      this.getUpgradeLevel(state, "biggerShop") * (def.shopLevelPerLevel || 0)
    );
  },

  /* ===================== STATISTIK UPGRADE ===================== */

  /**
   * Jumlah total level upgrade yang sudah dimiliki (semua kategori dijumlah).
   * @param {object} state
   * @returns {number}
   */
  getTotalLevelsOwned(state) {
    return UPGRADE_DEFINITIONS.reduce(
      (sum, def) => sum + this.getUpgradeLevel(state, def.id),
      0,
    );
  },

  /**
   * Total level maksimum dari seluruh upgrade (konstan, tidak bergantung state).
   * Dipakai sebagai "denominator" progress bar & syarat ekspansi.
   * Hasilnya: (25×5) + (20×5) + (15+10+15+15+10) = 290.
   * @returns {number}
   */
  getTotalMaxLevels() {
    return UPGRADE_DEFINITIONS.reduce((sum, def) => sum + def.maxLevel, 0);
  },

  /**
   * Cek apakah SEMUA upgrade di satu kedai sudah mencapai level maksimum.
   * Dipakai oleh kedai.js untuk memvalidasi syarat "semua upgrade harus MAX"
   * sebelum pemain boleh membuka kedai baru.
   * @param {object} state
   * @returns {boolean}
   */
  isFullyMaxed(state) {
    return UPGRADE_DEFINITIONS.every((def) => {
      const level = this.getUpgradeLevel(state, def.id);
      return this.isMaxed(def, level);
    });
  },

  /* ===================== MEMBELI UPGRADE ===================== */

  buyUpgrade(state, id) {
    const definition = this.getDefinitionById(id);
    if (!definition) return { success: false, reason: "unknown" };

    if (!this.isUnlocked(state, definition))
      return { success: false, reason: "locked" };

    const currentLevel = this.getUpgradeLevel(state, id);
    if (this.isMaxed(definition, currentLevel))
      return { success: false, reason: "maxed" };

    const price = this.calculatePrice(definition, currentLevel);
    if (!Wallet.spend(price))
      return { success: false, reason: "insufficient_funds" };

    state.upgrades[id] = currentLevel + 1;
    state.totalUpgrades += 1;
    state.totalUpgradesPurchased += 1;

    state.incomePerSecond = this.calculateTotalIncomePerSecond(state);
    state.employees = this.calculateTotalEmployees(state);
    state.shopLevel = this.calculateShopLevel(state);

    return { success: true, definition, newLevel: currentLevel + 1 };
  },

  handleBuyClick(event) {
    const button = event.target.closest("[data-upgrade-id]");
    if (!button || button.disabled) return;

    const id = button.dataset.upgradeId;
    const result = this.buyUpgrade(Game.state, id);

    if (!result.success) {
      if (result.reason === "insufficient_funds") {
        UI.showToast(
          "Saldo Wallet tidak cukup untuk membeli upgrade ini.",
          "danger",
        );
      }
      return;
    }

    UI.showToast(
      `${result.definition.name} naik ke level ${result.newLevel}!`,
      "success",
    );
    Dashboard.render(Game.state);

    const card = button.closest(".upgrade-card");
    if (card) card.classList.add("upgrade-card--success-flash");

    setTimeout(() => {
      this.render(Game.state);
      Storage.saveShopState(Game.activeShopId, Game.state);
    }, BUY_SUCCESS_ANIMATION_MS);
  },

  /* ===================== RENDER ===================== */

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
            Butuh ${this.getDefinitionById(definition.requires.id).name}
            level ${definition.requires.level}
          </p>
        </div>
      `;
    }

    const maxed = this.isMaxed(definition, level);
    const price = maxed ? null : this.calculatePrice(definition, level);
    const affordable = !maxed && Wallet.canAfford(price);
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
          ${maxed ? "⭐ MAX" : Utils.formatMoney(price)}
        </button>
      </div>
    `;
  },

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

      button.disabled = !Wallet.canAfford(
        this.calculatePrice(definition, level),
      );
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Shop.init();
});
