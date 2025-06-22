// Internationalization utility for Chrome extension
class I18n {
    constructor() {
        this.currentLocale = 'uk'; // Default locale
        this.messages = {}; // Cache for loaded messages
        this.init();
    }

    async init() {
        try {
            // Get current language from storage
            const result = await browserAPI.getStorage('language');
            this.currentLocale = result.language || 'uk';
            
            // Load messages for current locale
            await this.loadMessagesForLocale(this.currentLocale);
        } catch (error) {
            console.error('Error initializing i18n:', error);
            this.currentLocale = 'uk';
            await this.loadMessagesForLocale('uk');
        }
    }

    async loadMessagesForLocale(locale) {
        try {
            const extensionUrl = browserAPI.getURL(`_locales/${locale}/messages.json`);
            const response = await fetch(extensionUrl);
            
            if (response.ok) {
                this.messages = await response.json();
                this.currentLocale = locale;
            } else {
                console.warn(`Failed to load messages for locale: ${locale}`);
                // Fallback to default
                if (locale !== 'uk') {
                    await this.loadMessagesForLocale('uk');
                }
            }
        } catch (error) {
            console.error(`Error loading messages for locale ${locale}:`, error);
            // Fallback to default
            if (locale !== 'uk') {
                await this.loadMessagesForLocale('uk');
            }
        }
    }

    async switchLanguage(locale) {
        await this.loadMessagesForLocale(locale);
        this.translatePage();
    }

    getMessage(key, substitutions = []) {
        try {
            // First try to get from loaded messages
            if (this.messages[key] && this.messages[key].message) {
                let message = this.messages[key].message;
                
                // Handle substitutions
                if (substitutions && substitutions.length > 0) {
                    substitutions.forEach((sub, index) => {
                        message = message.replace(`$${index + 1}`, sub);
                    });
                }
                
                return message;
            }
            
            // Fallback to browser API
            return browserAPI.getI18nMessage(key, substitutions);
        } catch (error) {
            console.warn(`Error getting message for key: ${key}`, error);
            return key;
        }
    }

    // Get message with fallback (useful for content scripts)
    getMessageWithFallback(key, fallback) {
        const message = this.getMessage(key);
        return message || fallback || key;
    }

    // Initialize i18n on the current page (for popup/options pages)
    initialize() {
        // Wait for messages to load
        setTimeout(() => {
            this.translatePage();
        }, 100);
    }

    // Translate all elements with data-i18n attribute (for popup/options pages)
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = message;
            } else {
                element.textContent = message;
            }
        });
    }
}

// Create global i18n instance
const i18n = new I18n();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
} 