// src/utils/LanguageManager.js

class LanguageManager {
    static translations = null;
    static currentLanguage = 'en'; // Default language

    /**
     * Detects the browser's preferred language.
     * @returns {string} The detected language code (e.g., 'en', 'pt', 'es').
     */
    static getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        if (lang.startsWith('pt')) return 'pt';
        if (lang.startsWith('es')) return 'es';
        return 'en'; // Default to English
    }

    /**
     * Loads the translation file for the given language.
     * @param {Phaser.Scene} scene - The scene context to access the registry.
     * @param {string} lang - The language code (e.g., 'en', 'pt', 'es').
     */
    static async loadLanguage(scene, lang) {
        this.currentLanguage = lang;
        window.i18nReady = false; // Set flag to false during load

        try {
            // Use Vite's dynamic import feature for robust path handling.
            const langModule = await import(`../locales/${lang}.json`);
            this.translations = langModule.default;
            scene.registry.set('translations', this.translations);
            console.log(`[i18n] Language file for '${lang}' loaded successfully.`);
        } catch (error) {
            console.error(`[i18n] Could not load language file for '${lang}'. Trying fallback to 'en'.`, error);
            try {
                const fallbackModule = await import('../locales/en.json');
                this.translations = fallbackModule.default;
                scene.registry.set('translations', this.translations);
                console.log(`[i18n] Fallback to 'en' loaded successfully.`);
            } catch (fallbackError) {
                console.error('[i18n] CRITICAL: Fallback to English also failed. UI text will be broken.', fallbackError);
                this.translations = {}; // Use empty object to prevent crashes
                scene.registry.set('translations', this.translations);
            }
        } finally {
            // CRITICAL: Always set the flag to true after any attempt.
            // This ensures the application does not hang, even if all language files fail to load.
            window.i18nReady = true;
            console.log(`[i18n] Finalized loading. i18nReady is now ${window.i18nReady}.`);
        }
    }

    /**
     * Initializes the language manager by detecting the browser language and loading the translations.
     * @param {Phaser.Scene} scene - The scene context needed for initialization.
     */
    static async init(scene) {
        const browserLang = this.getBrowserLanguage();
        await this.loadLanguage(scene, browserLang);
    }

    /**
     * Gets a translated string for the given key and replaces placeholders.
     * This method is now static and does not require a scene context.
     * @param {string} key - The key of the translation string.
     * @param {object} [params={}] - An object with key-value pairs for placeholder replacement.
     * @returns {string} The translated and formatted string, or the key itself if not found.
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