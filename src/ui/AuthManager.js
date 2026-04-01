import { supabase } from '../lib/supabaseClient.js';
import playerStateService from '../services/PlayerStateService.js';

export default class AuthManager {
  constructor(overlayManager) {
    this.overlayManager = overlayManager;
    this.menu = document.getElementById('auth-menu');
    this.status = document.getElementById('auth-status');

    this.btnWeb3 = document.getElementById('btn-login-web3');
    this.btnGoogle = document.getElementById('btn-login-google');
    this.btnGuest = document.getElementById('btn-login-guest');
  }

  init() {
    this.menu.style.display = 'block'; // Ensure visibility
    this.attachListeners();

    // Disable non-guest buttons visually
    if (this.btnWeb3) {
      this.btnWeb3.classList.add('disabled');
      this.btnWeb3.style.opacity = '0.5';
      this.btnWeb3.style.pointerEvents = 'none';
      this.btnWeb3.innerText = 'WEB3 (OFFLINE)';
    }
    if (this.btnGoogle) {
      this.btnGoogle.classList.add('disabled');
      this.btnGoogle.style.opacity = '0.5';
      this.btnGoogle.style.pointerEvents = 'none';
      this.btnGoogle.innerText = 'GOOGLE (OFFLINE)';
    }
  }

  attachListeners() {
    if (this.btnGuest) {
      this.btnGuest.onclick = () => {
        this.overlayManager.playSound('click');
        this.overlayManager.startGameAsGuest();
      };
    }
  }

  setLoading(isLoading, msg = 'AUTHENTICATING...') {
    if (isLoading) {
      this.status.innerHTML = `<div class="pixel-spinner"></div><br>${msg}`;
      this.status.style.display = 'block';
      this.status.style.color = '#00ffff';
    } else {
      this.status.innerHTML = '';
    }
  }

  setError(msg) {
    this.setLoading(false);
    this.status.style.display = 'block';
    this.status.style.color = '#ff0000';
    this.status.innerHTML = `⚠️ ${msg}`;
    setTimeout(() => {
      this.status.innerHTML = '';
    }, 3000);
  }

  async loginGoogle() {
      // Disabled in Offline Mode
      this.setError('Cloud Auth is disabled in Offline Mode.');
  }
}
