const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const SOURCE_ROOT = path.join(__dirname, 'frontend/public');
const DEST_ROOT = path.join(__dirname, 'exported_assets');
const DIRS = {
  HERO: path.join(DEST_ROOT, 'hero'),
  SKILL: path.join(DEST_ROOT, 'skill'),
  ICONS: path.join(DEST_ROOT, 'icons')
};

// ==========================================
// DATA MAPPINGS (Extracted from helper.ts)
// ==========================================

const color1 = { 1: "blue", 2: "green", 3: "red", 4: "white", 5: "yellow" };
const color4 = { 1: "blue", 2: "green", 3: "purple", 4: "white", 5: "yellow" };
const color5 = { 1: "blue", 2: "green", 3: "red", 4: "purple", 5: "yellow" };
const witch = { 1: "blue", 2: "green", 3: "red", 4: "purple", 5: "yellow" };
const color6 = { 6: "" };

const hero = {
  0: { name: "unknown", color: color6 },
  1: { name: "frog", color: witch },
  2: { name: "knight", color: color1 },
  3: { name: "man", color: color4 },
  4: { name: "vampire", color: color5 },
  5: { name: "witch", color: witch },
  6: { name: "doge", color: color6 },
  7: { name: "pepe", color: color6 },
  8: { name: "ninja", color: color6 },
  9: { name: "king", color: color6 },
  10: { name: "rabbit", color: color6 },
  11: { name: "meo", color: color6 },
  12: { name: "monkey", color: color6 },
  13: { name: "pilot", color: color6 },
  14: { name: "cat", color: color6 },
  15: { name: "tiger", color: color6 },
  16: { name: "pugdog", color: color6 },
  17: { name: "sailormoon", color: color6 },
  18: { name: "pepeclown", color: color6 },
  19: { name: "froggentlemen", color: color6 },
  20: { name: "dragoon", color: color6 },
  21: { name: "ghost", color: color6 },
  22: { name: "pumpkin", color: color6 },
  23: { name: "werewolves", color: color6 },
  24: { name: "footballfrog", color: color6 },
  25: { name: "footballknight", color: color6 },
  26: { name: "footballman", color: color6 },
  27: { name: "footballvampire", color: color6 },
  28: { name: "footballwitch", color: color6 },
  29: { name: "footballdoge", color: color6 },
  30: { name: "footballpepe", color: color6 },
  31: { name: "footballninja", color: color6 },
};

const skills = {
  1: "treasure_hunter_icon",
  2: "jail_breaker_icon",
  3: "pierce_block_icon",
  4: "save_battery_icon",
  5: "fast_charge_icon",
  6: "bomb_pass_icon",
  7: "block_pass_icon",
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(srcPath, destName, type) {
  const destPath = path.join(DIRS[type], destName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`[OK] Copied ${destName}`);
  } else {
    console.warn(`[MISSING] Source file not found: ${srcPath}`);
  }
}

// ==========================================
// EXECUTION
// ==========================================

function main() {
  console.log("Starting Asset Extraction...");

  // 1. Create Directories
  Object.values(DIRS).forEach(ensureDir);

  // 2. Extract Heroes
  console.log("\n--- Extracting Heroes ---");
  for (const [skinId, info] of Object.entries(hero)) {
    for (const [colorId, colorName] of Object.entries(info.color)) {
      // Construct filename logic from helper.ts
      let filename = info.name;
      if (colorName) filename += "_" + colorName;
      filename += "_icon.png";

      const srcPath = path.join(SOURCE_ROOT, 'hero', filename);
      // Normalized output name: hero_{skin}_{color}.png
      const destName = `hero_s${skinId}_c${colorId}.png`;
      
      copyFile(srcPath, destName, 'HERO');
    }
  }

  // 3. Extract Skills
  console.log("\n--- Extracting Skills ---");
  for (const [skillId, filenameBase] of Object.entries(skills)) {
    const filename = filenameBase + ".png";
    const srcPath = path.join(SOURCE_ROOT, 'skill', filename);
    const destName = `skill_${skillId}.png`;
    
    copyFile(srcPath, destName, 'SKILL');
  }

  // 4. Extract Common Icons
  console.log("\n--- Extracting Common Icons ---");
  const commonIcons = [
    'token.png',
    'sen_token.png', 
    'bhero.webp',
    'bhouse.webp',
    'shield_lightning.png',
    'Icon_L.png',
    'HeroSIcon.png'
  ];

  commonIcons.forEach(icon => {
    const srcPath = path.join(SOURCE_ROOT, 'icons', icon);
    copyFile(srcPath, icon, 'ICONS');
  });

  console.log("\nExtraction Complete! Check 'exported_assets/' folder.");
}

main();
