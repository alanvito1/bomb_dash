// 🌹 AVRE Wiki Logic

const heroData = [
  {
    name: 'Mock Hero',
    type: 'Free',
    hp: 100,
    speed: 200,
    damage: 1,
    bombSize: 1.0,
  },
  { name: 'Ninja', type: 'NFT', hp: 120, speed: 250, damage: 2, bombSize: 1.2 },
  {
    name: 'Knight',
    type: 'NFT',
    hp: 150,
    speed: 180,
    damage: 3,
    bombSize: 1.5,
  },
  { name: 'Mage', type: 'NFT', hp: 90, speed: 220, damage: 4, bombSize: 2.0 },
];

const wagerTiers = {
  1: { name: 'Bronze', cost: 10, reward: 10 },
  2: { name: 'Silver', cost: 50, reward: 50 },
  3: { name: 'Gold', cost: 200, reward: 200 },
};

document.addEventListener('DOMContentLoaded', () => {
  renderHeroes();
  setupCalculator();
});

function renderHeroes() {
  const container = document.getElementById('hero-list');
  if (!container) return;

  heroData.forEach((hero) => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.innerHTML = `
      <div class="hero-name">${hero.name}</div>
      <div class="hero-stats">
        <p>Type: ${hero.type}</p>
        <p>HP: ${hero.hp}</p>
        <p>Speed: ${hero.speed}</p>
        <p>DMG: ${hero.damage}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

function setupCalculator() {
  const form = document.getElementById('roi-form');
  const resultDiv = document.getElementById('roi-result');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const matches =
      parseInt(document.getElementById('daily-matches').value) || 0;
    const winRate = parseInt(document.getElementById('win-rate').value) || 50;
    const tierId = parseInt(document.getElementById('wager-tier').value) || 1;

    const tier = wagerTiers[tierId];

    const wins = Math.floor(matches * (winRate / 100));
    const losses = matches - wins;

    // ROI Logic: (Wins * Reward) - (Losses * Cost)
    // Assuming simple wager mechanics where loser pays winner via the pot.
    // If I wager 10 and win, I get my 10 back + 10 (profit 10).
    // If I lose, I lose my 10 (profit -10).
    const profit = wins * tier.reward - losses * tier.cost;

    let message = `Estimated Daily Profit: ${profit} BCOIN`;
    if (profit > 0) {
      message += ` 🚀 (Stonks!)`;
      resultDiv.style.color = '#00ff00';
    } else {
      message += ` 📉 (Needs Practice)`;
      resultDiv.style.color = '#ff4444';
    }

    // Sunday Bonus Note
    const sundayProfit = Math.floor(profit * 1.1);
    message += `<br><small>Sunday Bonus: ~${sundayProfit} BCOIN</small>`;

    resultDiv.innerHTML = message;
  });
}
