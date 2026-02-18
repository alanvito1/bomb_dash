const API_BASE_URL = 'http://localhost:8080/api/admin';
let headers = {}; // Filled after obtaining secret

// =================================================================
// Data Loading Functions (GET)
// =================================================================

async function fetchGlobalSettings() {
  const form = document.getElementById('global-settings-form');
  const messageEl = document.getElementById('global-settings-message');

  if (!form) return;

  try {
    const response = await fetch(`${API_BASE_URL}/settings`, { headers });
    const data = await response.json();

    if (data.success) {
      const { settings } = data;
      if (form.elements.levelUpCost) form.elements.levelUpCost.value = settings.levelUpCost || '';
      if (form.elements.monsterScaleFactor) form.elements.monsterScaleFactor.value = settings.monsterScaleFactor || '';
      if (form.elements.pvpWinXp) form.elements.pvpWinXp.value = settings.pvpWinXp || '';
      if (form.elements.pvpCycleOpenHours) form.elements.pvpCycleOpenHours.value = settings.pvpCycleOpenHours || '';
      if (form.elements.pvpCycleClosedHours) form.elements.pvpCycleClosedHours.value = settings.pvpCycleClosedHours || '';

      const monsterXpContainer = document.getElementById('monster-xp-container');
      if (monsterXpContainer) {
          monsterXpContainer.innerHTML = '';
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

async function fetchPlayers() {
  const playerList = document.getElementById('player-list');
  if (!playerList) return;
  playerList.innerHTML = '<tr><td colspan="6">Loading players...</td></tr>';

  try {
    const response = await fetch(`${API_BASE_URL}/players`, { headers });
    const data = await response.json();

    if (data.success) {
      playerList.innerHTML = '';
      data.players.forEach((player) => {
        const row = document.createElement('tr');
        row.setAttribute('data-player-id', player.id);
        row.innerHTML = `
          <td>${player.id}</td>
          <td>${player.wallet_address}</td>
          <td><input type="number" name="level" value="${player.account_level || player.level || 1}"></td>
          <td><input type="number" name="xp" value="${player.account_xp || player.xp || 0}"></td>
          <td><input type="number" name="coins" value="${player.coins || 0}"></td>
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

async function fetchNews() {
    const listContainer = document.getElementById('news-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = 'Loading news...';
    try {
        // Use the admin endpoint to ensure we get everything if needed, or public.
        // Public endpoint is /api/news.
        const response = await fetch(`${API_BASE_URL.replace('/admin', '/news')}`);
        const data = await response.json();

        if (data.success) {
            listContainer.innerHTML = '';
            if (data.news.length === 0) {
                listContainer.innerHTML = '<p>No news found.</p>';
                return;
            }
            data.news.forEach(item => {
                const div = document.createElement('div');
                div.style.border = '1px solid #555';
                div.style.padding = '10px';
                div.style.marginBottom = '10px';
                div.style.backgroundColor = '#333';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: #00ffff;">${item.title} <span style="font-size: 12px; color: #aaa;">(${item.category})</span></h4>
                        <button onclick="window.deleteNews(${item.id})" style="background: #ff4444; border: none; color: white; cursor: pointer; padding: 5px 10px; border-radius: 4px;">Delete</button>
                    </div>
                    <small style="color: #888;">${new Date(item.created_at).toLocaleString()}</small>
                    <p style="margin-top: 5px; font-size: 14px; white-space: pre-wrap;">${item.content}</p>
                    ${item.image_url ? `<img src="${item.image_url}" style="max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #555;">` : ''}
                `;
                listContainer.appendChild(div);
            });
        } else {
            listContainer.innerHTML = 'Failed to load news.';
        }
    } catch (error) {
        listContainer.innerHTML = 'Error loading news.';
        console.error(error);
    }
}


// =================================================================
// Data Update Functions (POST/DELETE)
// =================================================================

async function saveGlobalSettings(event) {
  event.preventDefault();
  const form = event.target;
  const messageEl = document.getElementById('global-settings-message');
  const button = form.querySelector('button');
  button.disabled = true;
  messageEl.textContent = 'Saving...';
  messageEl.style.color = 'yellow';

  const monsterXpInputs = document.querySelectorAll(
    '#monster-xp-container input[type="number"]'
  );
  const monsterXp = {};
  monsterXpInputs.forEach((input) => {
    const monsterId = input.getAttribute('data-monster-id');
    monsterXp[monsterId] = parseInt(input.value, 10);
  });

  const settings = {
    levelUpCost: parseInt(form.elements.levelUpCost.value, 10),
    monsterScaleFactor: parseInt(form.elements.monsterScaleFactor.value, 10),
    pvpWinXp: parseInt(form.elements.pvpWinXp.value, 10),
    pvpCycleOpenHours: parseInt(form.elements.pvpCycleOpenHours.value, 10),
    pvpCycleClosedHours: parseInt(form.elements.pvpCycleClosedHours.value, 10),
    monsterXp,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
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

async function savePlayerStats(event) {
  const button = event.target;
  if (!button.classList.contains('btn-save-player')) return;

  const row = button.closest('tr');
  const playerId = row.getAttribute('data-player-id');
  const originalButtonText = button.textContent;

  button.textContent = 'Saving...';
  button.disabled = true;

  const stats = {
    account_level: parseInt(row.querySelector('input[name="level"]').value, 10),
    account_xp: parseInt(row.querySelector('input[name="xp"]').value, 10),
    coins: parseInt(row.querySelector('input[name="coins"]').value, 10),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/player/${playerId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(stats),
    });
    const data = await response.json();

    if (data.success) {
      button.textContent = 'Saved!';
      setTimeout(() => {
        button.textContent = originalButtonText;
      }, 2000);
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

async function saveNews(event) {
    event.preventDefault();
    const form = event.target;
    const messageEl = document.getElementById('news-message');
    const button = form.querySelector('button');
    button.disabled = true;

    const body = {
        title: form.elements['news-title'].value,
        category: form.elements['news-category'].value,
        image_url: form.elements['news-image'].value,
        content: form.elements['news-content'].value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/news`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.success) {
            messageEl.textContent = 'News posted successfully!';
            messageEl.style.color = 'lightgreen';
            form.reset();
            fetchNews();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        messageEl.textContent = error.message;
        messageEl.style.color = 'red';
    } finally {
        button.disabled = false;
    }
}

window.deleteNews = async (id) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/news/${id}`, {
            method: 'DELETE',
            headers
        });
        const data = await response.json();
        if (data.success) {
            fetchNews();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert(error.message);
    }
};

// =================================================================
// Event Listeners
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  const secret = prompt('Please enter the admin secret key:');
  if (!secret) {
    document.body.innerHTML =
      '<h1 style="color: red;">Access Denied. Admin secret is required.</h1>';
    return;
  }

  headers = {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  };

  fetchGlobalSettings();
  fetchPlayers();
  fetchNews();

  const settingsForm = document.getElementById('global-settings-form');
  if (settingsForm) settingsForm.addEventListener('submit', saveGlobalSettings);

  const playerList = document.getElementById('player-list');
  if (playerList) playerList.addEventListener('click', savePlayerStats);

  const newsForm = document.getElementById('news-form');
  if (newsForm) newsForm.addEventListener('submit', saveNews);
});
