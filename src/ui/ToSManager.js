import LanguageManager from '../utils/LanguageManager.js';

export default class ToSManager {
  constructor(overlayManager) {
    this.overlayManager = overlayManager;
    this.modal = document.getElementById('tos-modal');
    this.content = document.getElementById('tos-content');
    this.checkbox = document.getElementById('tos-checkbox');
    this.btn = document.getElementById('tos-btn');

    this.fullText = "";
    this.typingSpeed = 5; // ms per char
    this.isTyping = false;
  }

  async init() {
    this.modal.classList.add('active');

    // Load text from LanguageManager (or fallback)
    // We assume LanguageManager is already initialized by main.js or OverlayManager
    const termsText = LanguageManager.get('terms.text');
    this.fullText = (termsText && termsText !== 'terms.text')
        ? termsText
        : "TERMS OF SERVICE\n\n1. NO CHEATING.\n2. HAVE FUN.\n3. PROTOCOL 88 IS ACTIVE.";

    this.content.innerHTML = "";
    this.checkbox.checked = false;
    this.btn.classList.add('disabled');
    this.btn.disabled = true;

    this.startTypingEffect();
    this.attachListeners();
  }

  startTypingEffect() {
    this.isTyping = true;
    let i = 0;
    this.content.innerHTML = '<span class="typing-cursor"></span>';

    const typeChar = () => {
      if (i < this.fullText.length) {
        this.content.innerHTML = this.fullText.substring(0, i + 1) + '<span class="typing-cursor"></span>';
        this.content.scrollTop = this.content.scrollHeight; // Auto-scroll
        i++;
        setTimeout(typeChar, this.typingSpeed);
      } else {
        this.isTyping = false;
        this.content.innerHTML = this.fullText; // Remove cursor
      }
    };

    typeChar();
  }

  attachListeners() {
    // Checkbox listener
    this.checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.btn.classList.remove('disabled');
        this.btn.disabled = false;
        this.overlayManager.playSound('click');
      } else {
        this.btn.classList.add('disabled');
        this.btn.disabled = true;
      }
    });

    // Button listener
    this.btn.addEventListener('click', () => {
      if (!this.btn.disabled) {
        this.overlayManager.playSound('click');
        this.complete();
      }
    });
  }

  complete() {
    this.modal.classList.remove('active');
    // Transition to Auth Menu
    this.overlayManager.showAuthMenu();
  }
}
