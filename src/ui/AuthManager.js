import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import api from '../api.js';

// Initialize Supabase (Use empty strings if env vars missing to prevent crash, handle error later)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

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
    this.menu.classList.add('active');
    this.attachListeners();

    // Check for existing Supabase session (Google Redirect handling)
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('Supabase Session found:', session);
          this.handleGoogleSuccess(session);
        }
      });
    }
  }

  attachListeners() {
    // Remove old listeners to prevent duplicates if init called multiple times
    // (Though simple onclick replacement handles this automatically)
    this.btnWeb3.onclick = () => this.loginWeb3();
    this.btnGoogle.onclick = () => this.loginGoogle();
    this.btnGuest.onclick = () => this.loginGuest();
  }

  setLoading(isLoading, msg = 'AUTHENTICATING...') {
    if (isLoading) {
      this.status.innerHTML = `<div class="pixel-spinner"></div><br>${msg}`;
      this.status.style.display = 'block';
      this.status.style.background = 'transparent';
      this.status.style.border = 'none';

      this.btnWeb3.classList.add('disabled');
      this.btnGoogle.classList.add('disabled');
      this.btnGuest.classList.add('disabled');
    } else {
      this.status.innerHTML = '';
      this.btnWeb3.classList.remove('disabled');
      this.btnGoogle.classList.remove('disabled');
      this.btnGuest.classList.remove('disabled');
    }
  }

  setError(msg) {
    this.setLoading(false);

    // UX Pro: Styled Error Toast
    this.status.style.display = 'block';
    this.status.style.background = 'rgba(220, 20, 60, 0.6)'; // Crimson/Red semi-transparent
    this.status.style.border = '2px solid #ff0000';
    this.status.style.color = '#ffffff';
    this.status.style.padding = '10px';
    this.status.style.marginTop = '15px';
    this.status.style.textShadow = '2px 2px 0 #000';
    this.status.style.fontFamily = '"Press Start 2P", monospace';
    this.status.style.fontSize = '10px';

    this.status.innerHTML = `
      <span style="display:block; margin-bottom:5px;">⚠️ CONNECTION FAILED</span>
      <span>${msg}</span>
    `;

    // Auto-hide error after 5 seconds
    setTimeout(() => {
      if (this.status.innerHTML.includes('CONNECTION FAILED')) {
        this.status.style.display = 'none';
        this.status.innerHTML = '';
        this.status.style.background = 'transparent';
        this.status.style.border = 'none';
      }
    }, 5000);
  }

  // --- Login Methods ---

  async loginWeb3() {
    this.overlayManager.playSound('click');
    this.setLoading(true, 'CONNECTING WALLET...');

    try {
      // Explicitly await the login process
      // If user rejects signature or network error occurs, api.web3Login throws.
      await api.web3Login();

      // Only proceed if no error was thrown
      this.onSuccess();
    } catch (e) {
      console.error('[AuthManager] Web3 Login Error:', e);

      // Extract a user-friendly message
      let errorMsg = e.message || 'Unknown Error';
      if (errorMsg.includes('User rejected')) errorMsg = 'Signature Rejected';
      if (errorMsg.includes('MetaMask not detected'))
        errorMsg = 'Install MetaMask';

      this.setError(errorMsg);
      // Ensure we do NOT call onSuccess() here.
    }
  }

  async loginGuest() {
    this.overlayManager.playSound('click');
    this.setLoading(true, 'GENERATING GUEST ID...');

    try {
      // 1. Check or Create Local Wallet
      let pk = localStorage.getItem('guest_pk');
      if (!pk) {
        const wallet = ethers.Wallet.createRandom();
        pk = wallet.privateKey;
        localStorage.setItem('guest_pk', pk);
      }

      const wallet = new ethers.Wallet(pk);
      const address = await wallet.getAddress();

      // 2. Sign In using api.loginWithSigner
      // Note: ChainId 97 (BSC Testnet) is hardcoded for Guest Mode as default
      const chainId = 97;

      await api.loginWithSigner(wallet, address, chainId);
      this.onSuccess();
    } catch (e) {
      console.error(e);
      this.setError('Guest Login Failed');
    }
  }

  async loginGoogle() {
    this.overlayManager.playSound('click');

    if (!supabase) {
      this.setError('Google Login Config Missing');
      return;
    }

    this.setLoading(true, 'REDIRECTING TO GOOGLE...');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      this.setError(error.message);
    }
    // If successful, page redirects. Logic continues in init() after reload.
  }

  async handleGoogleSuccess(session) {
    this.setLoading(true, 'VERIFYING GOOGLE ID...');
    try {
      // Treating Google User as a Guest with a persistent wallet could be done here.
      // For now, we reuse the Guest logic but could key it off the User ID.
      // Simulating "Google Account Linked Wallet":
      const userId = session.user.id;
      let pk = localStorage.getItem(`google_wallet_${userId}`);

      if (!pk) {
        // Deterministic or random? Random is safer for now without complex crypto.
        const wallet = ethers.Wallet.createRandom();
        pk = wallet.privateKey;
        localStorage.setItem(`google_wallet_${userId}`, pk);
      }

      const wallet = new ethers.Wallet(pk);
      const address = await wallet.getAddress();
      await api.loginWithSigner(wallet, address, 97);
      this.onSuccess();
    } catch (e) {
      console.error(e);
      this.setError('Google-Linked Login Failed');
    }
  }

  onSuccess() {
    this.status.style.background = 'transparent';
    this.status.style.border = 'none';
    this.status.innerHTML = `<span style="color: #00ff00; text-shadow: 0 0 5px #00ff00;">ACCESS GRANTED</span>`;

    // Play a success sound if possible (optional)

    setTimeout(() => {
      this.menu.classList.remove('active');
      this.overlayManager.onAuthComplete();
    }, 1000);
  }
}
