const API_BASE_URL = 'http://localhost:3000/api/admin';
let headers = {}; // Será preenchido após obter o segredo

// =================================================================
// Funções de Carregamento de Dados (GET)
// =================================================================

/**
 * Busca as configurações globais do jogo e preenche o formulário.
 */
async function fetchGlobalSettings() {
  const form = document.getElementById('global-settings-form');
  const messageEl = document.getElementById('global-settings-message');

  try {
    const response = await fetch(`${API_BASE_URL}/settings`, { headers });
    const data = await response.json();

    if (data.success) {
      const { settings } = data;
      form.elements.levelUpCost.value = settings.levelUpCost;
      form.elements.monsterScaleFactor.value = settings.monsterScaleFactor;
      form.elements.pvpWinXp.value = settings.pvpWinXp;
      form.elements.pvpCycleOpenHours.value = settings.pvpCycleOpenHours;
      form.elements.pvpCycleClosedHours.value = settings.pvpCycleClosedHours;

      // Popula dinamicamente a seção de XP de monstros
      const monsterXpContainer = document.getElementById('monster-xp-container');
      monsterXpContainer.innerHTML = ''; // Limpa o container
      if (settings.monsterXp) {
        for (const monsterId in settings.monsterXp) {
          const xpValue = settings.monsterXp[monsterId];
          const group = document.createElement('div');
          group.className = 'form-group';
          group.innerHTML = `
            <label for="monster-xp-${monsterId}">XP for ${monsterId}:</label>
            <input type="number" id="monster-xp-${monsterId}" name="monster-xp-${monsterId}" value="${xpValue}" data-monster-id="${monsterId}">
          `;
          monsterXpContainer.appendChild(group);
        }
      }

      messageEl.textContent = 'Settings loaded successfully.';
      messageEl.style.color = 'lightgreen';
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    messageEl.textContent = `Error loading settings: ${error.message}`;
    messageEl.style.color = 'red';
    console.error('Failed to fetch global settings:', error);
  }
}

/**
 * Busca a lista de todos os jogadores e preenche a tabela.
 */
async function fetchPlayers() {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = '<tr><td colspan="6">Loading players...</td></tr>';

  try {
    const response = await fetch(`${API_BASE_URL}/players`, { headers });
    const data = await response.json();

    if (data.success) {
      playerList.innerHTML = ''; // Limpa a linha de "loading"
      data.players.forEach(player => {
        const row = document.createElement('tr');
        row.setAttribute('data-player-id', player.id);
        row.innerHTML = `
          <td>${player.id}</td>
          <td>${player.wallet_address}</td>
          <td><input type="number" name="level" value="${player.level}"></td>
          <td><input type="number" name="xp" value="${player.xp}"></td>
          <td><input type="number" name="coins" value="${player.coins}"></td>
          <td><button class="btn btn-save-player">Save</button></td>
        `;
        playerList.appendChild(row);
      });
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    playerList.innerHTML = `<tr><td colspan="6" style="color: red;">Error loading players: ${error.message}</td></tr>`;
    console.error('Failed to fetch players:', error);
  }
}

// =================================================================
// Funções de Atualização de Dados (POST)
// =================================================================

/**
 * Salva as configurações globais do jogo.
 * @param {Event} event - O evento de submit do formulário.
 */
async function saveGlobalSettings(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('global-settings-message');
  const button = form.querySelector('button');
  button.disabled = true;
  messageEl.textContent = 'Saving...';
  messageEl.style.color = 'yellow';

  const monsterXpInputs = document.querySelectorAll('#monster-xp-container input[type="number"]');
  const monsterXp = {};
  monsterXpInputs.forEach(input => {
    const monsterId = input.getAttribute('data-monster-id');
    monsterXp[monsterId] = parseInt(input.value, 10);
  });

  const settings = {
    levelUpCost: parseInt(form.elements.levelUpCost.value, 10),
    monsterScaleFactor: parseInt(form.elements.monsterScaleFactor.value, 10),
    pvpWinXp: parseInt(form.elements.pvpWinXp.value, 10),
    pvpCycleOpenHours: parseInt(form.elements.pvpCycleOpenHours.value, 10),
    pvpCycleClosedHours: parseInt(form.elements.pvpCycleClosedHours.value, 10),
    monsterXp, // Adiciona o objeto de XP dos monstros
  };

  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings)
    });
    const data = await response.json();

    if (data.success) {
      messageEl.textContent = 'Global settings saved successfully!';
      messageEl.style.color = 'lightgreen';
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    messageEl.textContent = `Error saving settings: ${error.message}`;
    messageEl.style.color = 'red';
    console.error('Failed to save global settings:', error);
  } finally {
    button.disabled = false;
  }
}

/**
 * Salva as estatísticas de um jogador específico.
 * @param {Event} event - O evento de clique no botão "Save".
 */
async function savePlayerStats(event) {
  const button = event.target;
  if (!button.classList.contains('btn-save-player')) return;

  const row = button.closest('tr');
  const playerId = row.getAttribute('data-player-id');
  const originalButtonText = button.textContent;

  button.textContent = 'Saving...';
  button.disabled = true;

  const stats = {
    level: parseInt(row.querySelector('input[name="level"]').value, 10),
    xp: parseInt(row.querySelector('input[name="xp"]').value, 10),
    coins: parseInt(row.querySelector('input[name="coins"]').value, 10)
  };

  try {
    const response = await fetch(`${API_BASE_URL}/player/${playerId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(stats)
    });
    const data = await response.json();

    if (data.success) {
      button.textContent = 'Saved!';
      setTimeout(() => { button.textContent = originalButtonText; }, 2000);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error(`Failed to save stats for player ${playerId}:`, error);
    alert(`Error saving player ${playerId}: ${error.message}`);
    button.textContent = 'Error!';
  } finally {
    setTimeout(() => {
        button.disabled = false;
        button.textContent = originalButtonText;
    }, 2000);
  }
}


// =================================================================
// Event Listeners
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  const secret = prompt("Please enter the admin secret key:");
  if (!secret) {
    document.body.innerHTML = '<h1 style="color: red;">Access Denied. Admin secret is required.</h1>';
    return;
  }

  headers = {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret
  };

  // Carrega os dados iniciais quando a página é carregada
  fetchGlobalSettings();
  fetchPlayers();

  // Adiciona o listener para o formulário de configurações globais
  document.getElementById('global-settings-form').addEventListener('submit', saveGlobalSettings);

  // Adiciona um listener de clique na tabela para os botões de salvar (delegação de evento)
  document.getElementById('player-list').addEventListener('click', savePlayerStats);
});