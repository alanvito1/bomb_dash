const STORAGE_KEY = 'playerUpgrades';

export function getUpgrades() {
  const data = localStorage.getItem(STORAGE_KEY);
  try {
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.warn('[getUpgrades] Erro ao ler upgrades salvos:', e);
    return {};
  }
}

export function saveUpgrades(upgrades = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upgrades));
  } catch (e) {
    console.error('[saveUpgrades] Falha ao salvar upgrades:', e);
  }
}
