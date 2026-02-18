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
                console.log("Supabase Session found:", session);
                this.handleGoogleSuccess(session);
            }
        });
    }
  }

  attachListeners() {
    this.btnWeb3.onclick = () => this.loginWeb3();
    this.btnGoogle.onclick = () => this.loginGoogle();
    this.btnGuest.onclick = () => this.loginGuest();
  }

  setLoading(isLoading, msg = "AUTHENTICATING...") {
    if (isLoading) {
      this.status.innerHTML = `<div class="pixel-spinner"></div><br>${msg}`;
      this.btnWeb3.classList.add('disabled');
      this.btnGoogle.classList.add('disabled');
      this.btnGuest.classList.add('disabled');
    } else {
      this.status.innerHTML = "";
      this.btnWeb3.classList.remove('disabled');
      this.btnGoogle.classList.remove('disabled');
      this.btnGuest.classList.remove('disabled');
    }
  }

  setError(msg) {
    this.setLoading(false);
    this.status.innerHTML = `<span style="color: #ff4444;">ERROR: ${msg}</span>`;
  }

  // --- Login Methods ---

  async loginWeb3() {
    this.overlayManager.playSound('click');
    this.setLoading(true, "CONNECTING WALLET...");
    try {
      await api.web3Login();
      this.onSuccess();
    } catch (e) {
      console.error(e);
      this.setError(e.message || "Connection Failed");
    }
  }

  async loginGuest() {
    this.overlayManager.playSound('click');
    this.setLoading(true, "GENERATING GUEST ID...");

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
      // Note: ChainId 97 (BSC Testnet) is hardcoded for Guest Mode as default if no provider
      const chainId = 97;

      await api.loginWithSigner(wallet, address, chainId);
      this.onSuccess();

    } catch (e) {
      console.error(e);
      this.setError("Guest Login Failed");
    }
  }

  async loginGoogle() {
    this.overlayManager.playSound('click');

    if (!supabase) {
      this.setError("Google Login Config Missing");
      return;
    }

    this.setLoading(true, "REDIRECTING TO GOOGLE...");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      this.setError(error.message);
    }
    // If successful, page redirects. Logic continues in init() after reload.
  }

  async handleGoogleSuccess(session) {
    this.setLoading(true, "VERIFYING GOOGLE ID...");
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
        this.setError("Google-Linked Login Failed");
    }
  }

  onSuccess() {
    this.status.innerHTML = `<span style="color: #00ff00;">ACCESS GRANTED</span>`;
    setTimeout(() => {
      this.menu.classList.remove('active');
      this.overlayManager.onAuthComplete();
    }, 1000);
  }
}
