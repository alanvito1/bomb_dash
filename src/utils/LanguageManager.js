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
            const response = await fetch(`src/locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();

            scene.registry.set('translations', this.translations);
            console.log(`[i18n] Language file for '${lang}' loaded successfully.`);
            window.i18nReady = true; // Signal that translations are ready
        } catch (error) {
            console.error(`[i18n] Could not load language file for '${lang}'. Defaulting to English.`, error);
            if (lang !== 'en') {
                // Await the fallback, but don't do anything with the result.
                // The recursive call will handle setting the translations and the flag.
                await this.loadLanguage(scene, 'en');
            } else {
                // This is the base case for failure: English itself failed to load.
                this.translations = {}; // Set empty translations
                console.error('[i18n] Fallback to English also failed. Using empty translations.');
                // CRITICAL: Signal that i18n is "ready" even on total failure
                // to prevent the application from hanging indefinitely.
                window.i18nReady = true;
            }
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