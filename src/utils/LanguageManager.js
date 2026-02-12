/**
 * @class LanguageManager
 * @description A static utility class to handle internationalization (i18n).
 * It loads translation files based on browser language, provides a method to
 * retrieve translated strings, and handles placeholder replacements.
 */
class LanguageManager {
  /**
   * @static
   * @property {object | null} translations - Stores the loaded translation key-value pairs.
   */
  static translations = null;
  /**
   * @static
   * @property {string} currentLanguage - The currently active language code (e.g., 'en').
   */
  static currentLanguage = 'en'; // Default language

  /**
   * Detects the browser's preferred language.
   * Maps specific language codes (e.g., 'pt-BR') to supported languages ('pt').
   * @returns {string} The detected language code ('en', 'pt', 'es'). Defaults to 'en'.
   */
  static getBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    if (lang.startsWith('pt')) return 'pt';
    if (lang.startsWith('es')) return 'es';
    return 'en'; // Default to English
  }

  /**
   * Asynchronously loads a translation file for the specified language.
   * It uses dynamic imports to fetch the JSON file and stores the result.
   * If the requested language fails, it attempts to load 'en' as a fallback.
   * It also sets a global `window.i18nReady` flag upon completion to signal
   * that the application can proceed with rendering text.
   * @param {Phaser.Scene} scene - The scene context used to access the global registry.
   * @param {string} lang - The language code to load (e.g., 'en').
   * @returns {Promise<void>} A promise that resolves when the language file has been loaded or failed.
   */
  static async loadLanguage(scene, lang) {
    this.currentLanguage = lang;
    window.i18nReady = false;

    try {
      const langModule = await import(`../locales/${lang}.json`);
      this.translations = langModule.default;
      scene.registry.set('translations', this.translations);
      console.log(`[i18n] Language file for '${lang}' loaded successfully.`);
    } catch (error) {
      console.error(
        `[i18n] Could not load language file for '${lang}'. Trying fallback to 'en'.`,
        error
      );
      try {
        const fallbackModule = await import('../locales/en.json');
        this.translations = fallbackModule.default;
        scene.registry.set('translations', this.translations);
        console.log(`[i18n] Fallback to 'en' loaded successfully.`);
      } catch (fallbackError) {
        console.error(
          '[i18n] CRITICAL: Fallback to English also failed. UI text will be broken.',
          fallbackError
        );
        this.translations = {}; // Prevent crashes on get()
        scene.registry.set('translations', this.translations);
      }
    } finally {
      window.i18nReady = true;
      console.log(
        `[i18n] Finalized loading. i18nReady is now ${window.i18nReady}.`
      );
    }
  }

  /**
   * Initializes the LanguageManager.
   * It detects the browser's language and loads the corresponding translation file.
   * This should be called once at the start of the application (e.g., in a loading scene).
   * @param {Phaser.Scene} scene - The scene context required for loading.
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  static async init(scene) {
    const browserLang = this.getBrowserLanguage();
    await this.loadLanguage(scene, browserLang);
  }

  /**
   * Gets a translated string for a given key and interpolates parameters.
   * @param {string} key - The key of the translation string (e.g., 'mainMenu.playButton').
   * @param {object} [params={}] - An object with key-value pairs for placeholder replacement.
   * Placeholders in the string should be in the format `{placeholderName}`.
   * @example
   * // In en.json: "welcome": "Welcome, {username}!"
   * LanguageManager.get('welcome', { username: 'Player1' }); // Returns "Welcome, Player1!"
   * @returns {string} The translated and formatted string. If the key is not found, it returns the key itself.
   */
  static get(key, params = {}) {
    const translations = this.translations;
    let text = translations ? translations[key] : null;

    if (text) {
      for (const paramKey in params) {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
      }
      return text;
    }

    console.warn(`[i18n] Translation key not found: "${key}"`);
    return key;
  }
}

export default LanguageManager;
