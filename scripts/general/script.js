class AtlasGeneralHelper {
    constructor() {
        this.settings = {};
        this.init();
        console.log('Atlas Festival Helper - General script initialized');
    }

    async init() {
        // Load current language setting first
        try {
            const languageResult = await browserAPI.getStorage('language');
            const currentLanguage = languageResult.language || 'uk';
            document.documentElement.lang = currentLanguage;
        } catch (error) {
            console.error('Error loading language setting:', error);
            document.documentElement.lang = 'uk';
        }

        // Initialize i18n
        await i18n.init();

        await this.loadSettings();
        this.applySettings();
        this.setupStorageListener();
    }

    async loadSettings() {
        try {
            this.settings = await browserAPI.getStorage({});
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {};
        }
    }

    applySettings() {
        // TODO: Implement general settings
    }

    setupStorageListener() {
        browserAPI.addStorageChangeListener((changes) => {
            this.applySettings();
        });
    }
}

new AtlasGeneralHelper();