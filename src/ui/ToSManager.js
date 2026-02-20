import LanguageManager from '../utils/LanguageManager.js';

export default class ToSManager {
  constructor(overlayManager) {
    this.overlayManager = overlayManager;
    // Bind to DOM elements dynamically in init to ensure they exist
    this.fullText = '';
  }

  init() {
    this.modal = document.getElementById('tos-modal');
    this.content = document.getElementById('tos-content');
    this.checkbox = document.getElementById('tos-checkbox');
    this.btn = document.getElementById('tos-btn');

    if (!this.modal) {
      console.error('ToS Modal element not found');
      return;
    }

    this.modal.style.display = 'block'; // Ensure it's visible within the flex container
    // Actually the parent is flex, the panels might be hidden/shown via display
    // The previous CSS likely handled it via classes.
    // Let's assume .ui-panel is visible by default or managed here.
    // We'll hide other panels just in case.
    document
      .querySelectorAll('.ui-panel')
      .forEach((p) => (p.style.display = 'none'));
    this.modal.style.display = 'block';

    const termsText = LanguageManager.get('terms.text');
    // Using a more cyberpunk/terminal text as requested
    this.fullText =
      termsText && termsText !== 'terms.text'
        ? termsText
        : `>>> INITIALIZING PROTOCOL 88...
>>> LOADING ASSETS...
>>> DECRYPTING...

[TERMS OF ENGAGEMENT]

1. THE ARENA IS LETHAL. DEATH IS PERMANENT FOR SESSION DATA UNLESS SECURED.
2. UNAUTHORIZED MODIFICATIONS (CHEATS) WILL RESULT IN IMMEDIATE TERMINATION.
3. BY PROCEEDING, YOU ACKNOWLEDGE THAT BCOIN AND FRAGMENTS ARE DIGITAL ASSETS.
4. HAVE FUN. OR DIE TRYING.

>>> AWAITING USER CONFIRMATION...`;

    this.content.innerHTML = '';
    this.checkbox.checked = false;
    this.btn.classList.add('disabled');
    this.btn.disabled = true;

    // Typewriter Effect
    let i = 0;
    this.content.innerHTML = '<span class="typing-cursor"></span>';
    const typeChar = () => {
      if (i < this.fullText.length) {
        this.content.innerText = this.fullText.substring(0, i + 1);
        this.content.scrollTop = this.content.scrollHeight;
        i++;
        // Faster typing
        setTimeout(typeChar, 10);
      }
    };
    typeChar();

    // Listeners
    // Remove old listeners to avoid duplicates if re-init
    const newCheckbox = this.checkbox.cloneNode(true);
    this.checkbox.parentNode.replaceChild(newCheckbox, this.checkbox);
    this.checkbox = newCheckbox;

    const newBtn = this.btn.cloneNode(true);
    this.btn.parentNode.replaceChild(newBtn, this.btn);
    this.btn = newBtn;

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

    this.btn.addEventListener('click', () => {
      if (!this.btn.disabled) {
        this.overlayManager.playSound('click');
        this.complete();
      }
    });
  }

  complete() {
    this.modal.style.display = 'none';

    // SAVE ACCEPTANCE
    localStorage.setItem('termsAccepted', 'true');
    console.log('[ToS] Terms Accepted. Starting Game Loop.');

    // SKIP AUTH -> GO DIRECTLY TO GAME
    this.overlayManager.startGameDirectly();
  }
}
