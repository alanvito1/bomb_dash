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

    // Session check is now handled by OverlayManager before this menu appears
    // But we keep this for redundancy or direct access if needed
  }

  attachListeners() {
    if (this.btnWeb3) {
      this.btnWeb3.onclick = () => {
        this.overlayManager.playSound('click');
        // Web3 Logic (Coming Soon)
      };
    }

    if (this.btnGoogle) {
      this.btnGoogle.onclick = () => this.loginGoogle();
    }

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

      if (this.btnGoogle) this.btnGoogle.classList.add('disabled');
    } else {
      this.status.innerHTML = '';
      if (this.btnGoogle) this.btnGoogle.classList.remove('disabled');
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
    this.overlayManager.playSound('click');

    if (!supabase) {
      this.setError('Configuration Error');
      return;
    }

    this.setLoading(true, 'REDIRECTING...');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Redirect back to game
      },
    });

    if (error) {
      this.setError(error.message);
    }
    // Browser will redirect now.
  }
}
