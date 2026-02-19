import supabase from '../services/supabaseClient.js';
import api from '../api.js';

export default class ChatWidget {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.messages = [];
    this.container = null;
    this.listElement = null;
    this.inputElement = null;
    this.channel = null;

    this.createDOM();
    this.subscribeToChannel();
  }

  createDOM() {
    // Check if already exists (singleton-ish per scene, but scenes are destroyed)
    const existing = document.getElementById('chat-widget-container');
    if (existing) existing.remove();

    // Main Container
    this.container = document.createElement('div');
    this.container.id = 'chat-widget-container';
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '100px', // Above bottom dock
      left: '20px',
      width: '300px',
      height: '40px', // Minimized height
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      border: '2px solid #00ffff',
      borderRadius: '8px',
      color: '#fff',
      fontFamily: '"Press Start 2P", sans-serif',
      fontSize: '10px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'height 0.3s ease',
      zIndex: '1000',
      pointerEvents: 'auto',
    });

    // Toggle Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 10px',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
    });
    header.innerHTML = '<span>GLOBAL CHAT</span> <span id="chat-toggle-icon">▲</span>';
    header.onclick = () => this.toggle();
    this.container.appendChild(header);

    // Messages List
    this.listElement = document.createElement('div');
    Object.assign(this.listElement.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '10px',
      display: 'none', // Hidden when minimized
      scrollbarWidth: 'thin',
      scrollbarColor: '#00ffff #000',
    });
    this.container.appendChild(this.listElement);

    // Input Area
    const inputContainer = document.createElement('div');
    Object.assign(inputContainer.style, {
      height: '40px',
      display: 'none', // Hidden when minimized
      padding: '5px',
      borderTop: '1px solid #333',
    });

    this.inputElement = document.createElement('input');
    Object.assign(this.inputElement.style, {
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '1px solid #555',
      color: '#fff',
      padding: '0 5px',
      fontFamily: 'inherit',
      fontSize: '10px',
    });
    this.inputElement.placeholder = 'Type message...';

    this.inputElement.onkeydown = (e) => {
      if (e.key === 'Enter') this.sendMessage();
      e.stopPropagation(); // Prevent Phaser from capturing keys
    };
    // Stop propagation on focus to prevent game controls firing
    this.inputElement.onfocus = () => {
        if (this.scene.input) this.scene.input.keyboard.enabled = false;
    };
    this.inputElement.onblur = () => {
        if (this.scene.input) this.scene.input.keyboard.enabled = true;
    };

    inputContainer.appendChild(this.inputElement);
    this.container.appendChild(inputContainer);

    // Append to game container
    const gameContainer = document.getElementById('game-container') || document.body;
    gameContainer.appendChild(this.container);

    this.inputContainer = inputContainer;
  }

  toggle() {
    this.isVisible = !this.isVisible;
    const icon = this.container.querySelector('#chat-toggle-icon');

    if (this.isVisible) {
      this.container.style.height = '300px';
      this.listElement.style.display = 'block';
      this.inputContainer.style.display = 'block';
      icon.innerText = '▼';
      this.scrollToBottom();
    } else {
      this.container.style.height = '40px';
      this.listElement.style.display = 'none';
      this.inputContainer.style.display = 'none';
      icon.innerText = '▲';
    }
  }

  async subscribeToChannel() {
    if (!supabase) return;

    this.channel = supabase.channel('global-chat');

    this.channel
      .on('broadcast', { event: 'chat-message' }, (payload) => {
        this.addMessage(payload.payload);
      })
      .on('broadcast', { event: 'system-message' }, (payload) => {
        this.addSystemMessage(payload.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Chat Connected');
          this.addSystemMessage({ message: 'Connected to Global Chat.' });
        }
      });
  }

  addMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '5px';
    msgDiv.style.wordWrap = 'break-word';

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tag = data.tag ? `[<span style="color:#ffd700">${data.tag}</span>] ` : '';
    const name = `<span style="color:#00ffff">${data.user}</span>`;

    msgDiv.innerHTML = `<span style="color:#888; font-size:8px;">${timestamp}</span> ${tag}${name}: ${data.text}`;

    this.listElement.appendChild(msgDiv);
    this.scrollToBottom();
  }

  addSystemMessage(data) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '5px';
    msgDiv.style.color = '#ffd700'; // Gold
    msgDiv.style.fontStyle = 'italic';
    msgDiv.innerText = `[SYSTEM] ${data.message}`;

    this.listElement.appendChild(msgDiv);
    this.scrollToBottom();
  }

  async sendMessage() {
    const text = this.inputElement.value.trim();
    if (!text || !supabase) return;

    // Get User Info
    const user = await api.getCurrentUser();
    // Assuming API returns user data, or we use local storage/registry
    // API `getCurrentUser` returns the auth/me response.
    // If fail, user is Guest.

    let username = 'Guest';
    let tag = '';

    if (user && user.success) {
        username = user.user.walletAddress.substring(0, 6);
        // Fetch Guild Tag if not present in user object (might need to fetch 'my-guild' or store in session)
        // Ideally we store this. For now, let's try to get it.
        // Optimization: Fetch guild tag on init and store in class.
    }

    // Send via Channel
    // Note: Supabase Broadcast from client is allowed if RLS policies permit.
    // If not, we might need to send via backend endpoint.
    // Assuming RLS allows broadcast for authenticated users on this channel.

    await this.channel.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: {
        user: username,
        tag: this.guildTag || '', // To do: fetch guild tag
        text: text
      }
    });

    this.inputElement.value = '';
  }

  scrollToBottom() {
    if (this.listElement) {
      this.listElement.scrollTop = this.listElement.scrollHeight;
    }
  }

  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }

  destroy() {
    if (this.container) {
      this.container.remove();
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
  }
}
