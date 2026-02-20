import UIModal from './UIModal.js';
import api from '../api.js';
import SoundManager from '../utils/sound.js';

export default class SocialModal extends UIModal {
  constructor(scene) {
    super(scene, 500, 600, 'SOCIAL');
    this.currentTab = 'list'; // 'list', 'create', 'my_guild'
    this.guildData = null;
    this.populate();
  }

  async populate() {
    this.clearContent();

    // Fetch My Guild Status first
    try {
      const res = await api.getMyGuild();
      this.myGuild = res.success ? res.guild : null;
      this.myRole = res.success ? res.role : null;
    } catch (e) {
      console.error(e);
      this.myGuild = null;
    }

    // Tabs
    this.createTabs();

    // Content
    if (this.currentTab === 'list') {
      this.showGuildList();
    } else if (this.currentTab === 'create') {
      this.showCreateForm();
    } else if (this.currentTab === 'my_guild') {
      this.showMyGuild();
    }
  }

  createTabs() {
    const tabs = [
      { key: 'list', label: 'BROWSE' },
      { key: 'create', label: 'CREATE' },
      { key: 'my_guild', label: 'MY GUILD' },
    ];

    let startX = -this.modalWidth / 2 + 60;
    const y = -this.modalHeight / 2 + 60;
    const spacing = 120;

    tabs.forEach((tab, index) => {
      const isActive = this.currentTab === tab.key;
      const btn = this.scene.add
        .text(startX + index * spacing, y, tab.label, {
          fontFamily: '"Press Start 2P"',
          fontSize: '12px',
          fill: isActive ? '#00ffff' : '#666666',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        if (this.currentTab !== tab.key) {
          SoundManager.playClick(this.scene);
          this.currentTab = tab.key;
          this.populate();
        }
      });

      this.windowContainer.add(btn);
    });

    // Separator
    const line = this.scene.add.graphics();
    line.lineStyle(2, 0x333333);
    line.beginPath();
    line.moveTo(-this.modalWidth / 2 + 20, y + 20);
    line.lineTo(this.modalWidth / 2 - 20, y + 20);
    line.strokePath();
    this.windowContainer.add(line);
  }

  async showGuildList() {
    const loading = this.scene.add
      .text(0, 0, 'Loading...', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#fff',
      })
      .setOrigin(0.5);
    this.windowContainer.add(loading);

    try {
      const res = await api.getGuilds();
      loading.destroy();

      if (!res.success || !res.guilds.length) {
        this.addText(0, 0, 'No Guilds Found.', '#888');
        return;
      }

      const startY = -this.modalHeight / 2 + 100;
      res.guilds.forEach((guild, i) => {
        if (i > 8) return; // Limit for now
        this.createGuildRow(0, startY + i * 50, guild);
      });
    } catch (e) {
      loading.setText('Error loading guilds.');
    }
  }

  createGuildRow(x, y, guild) {
    const w = this.modalWidth - 60;
    const h = 40;

    const container = this.scene.add.container(x, y);

    // Bg
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    container.add(bg);

    // Tag
    const tag = this.scene.add
      .text(-w / 2 + 20, 0, `[${guild.tag}]`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ffd700',
      })
      .setOrigin(0, 0.5);

    // Name
    const name = this.scene.add
      .text(-w / 2 + 100, 0, guild.name, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#fff',
      })
      .setOrigin(0, 0.5);

    // Members
    const members = this.scene.add
      .text(w / 2 - 80, 0, `${guild.memberCount} Mbrs`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#888',
      })
      .setOrigin(1, 0.5);

    // Join Button (if not in guild)
    if (!this.myGuild) {
      const btn = this.createButton(w / 2 - 40, 0, 'JOIN', 60, 24, () =>
        this.joinGuild(guild.id)
      );
      container.add(btn);
    }

    container.add([tag, name, members]);
    this.windowContainer.add(container);
  }

  async joinGuild(guildId) {
    try {
      const res = await api.joinGuild(guildId);
      if (res.success) {
        // Refresh UI
        this.currentTab = 'my_guild';
        this.populate();
        // Optionally refresh user data to get tag
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
    }
  }

  showCreateForm() {
    if (this.myGuild) {
      this.addText(0, 0, `You are already in [${this.myGuild.tag}]`, '#f00');
      return;
    }

    this.addText(0, -50, 'Create a New Guild', '#fff');
    this.addText(0, -20, 'Cost: 100 BCOIN', '#ffd700');

    // Create Button
    const btn = this.createButton(0, 50, 'CREATE GUILD', 150, 40, () => {
      // Use browser prompt for now as Phaser inputs are tricky without DOM
      const name = prompt('Guild Name:');
      if (!name) return;
      const tag = prompt('Guild Tag (3-4 Uppercase Alphanumeric):');
      if (!tag) return;

      this.doCreateGuild(name, tag);
    });

    this.windowContainer.add(btn);
  }

  async doCreateGuild(name, tag) {
    try {
      const res = await api.createGuild(name, tag);
      if (res.success) {
        SoundManager.play(this.scene, 'level_up');
        this.currentTab = 'my_guild';
        this.populate();
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Creation failed');
    }
  }

  showMyGuild() {
    if (!this.myGuild) {
      this.addText(0, 0, 'You are not in a guild.', '#888');
      const btn = this.createButton(0, 50, 'BROWSE GUILDS', 150, 40, () => {
        this.currentTab = 'list';
        this.populate();
      });
      this.windowContainer.add(btn);
      return;
    }

    const g = this.myGuild;
    this.addText(0, -100, `[${g.tag}]`, '#ffd700', '24px');
    this.addText(0, -60, g.name, '#fff', '16px');
    this.addText(0, -30, `Role: ${this.myRole}`, '#00ffff');

    // Members list placeholder
    this.addText(0, 20, 'Members:', '#888');

    this.addText(0, 50, '(Member list coming soon)', '#555');
  }

  addText(x, y, text, color, size = '12px') {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: size,
        fill: color,
        align: 'center',
      })
      .setOrigin(0.5);
    this.windowContainer.add(t);
  }

  createButton(x, y, label, w, h, callback) {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x00ff00, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#000',
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', callback);

    return container;
  }

  clearContent() {
    // Clear everything except background/close button from base class
    // Since UIModal doesn't expose a clean method, we assume windowContainer
    // handles the content.
    this.windowContainer.removeAll(true);
  }
}
