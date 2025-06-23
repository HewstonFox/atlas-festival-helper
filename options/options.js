// Atlas Festival Helper - Options Script
// Import the browser API facade
// Note: In Chrome extensions, this will be loaded via script tag in HTML

class AtlasFestivalHelperOptions {
    constructor() {
        this.defaultSettings = {
            scheduleHelper: true,
            language: 'uk' // Default to Ukrainian as per manifest
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();

        // Initialize i18n
        i18n.initialize();

        console.log('Atlas Festival Helper options initialized');
    }

    setupEventListeners() {
        // Toggle switch for schedule helper only
        document.getElementById('schedule-helper-toggle').addEventListener('click', () => {
            this.toggleSetting('scheduleHelper');
        });

        // Language selector
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.updateLanguage(e.target.value);
        });

        // Export and reset buttons
        document.getElementById('export-settings').addEventListener('click', () => {
            this.exportSettings();
        });

        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });
    }

    async loadSettings() {
        try {
            const result = await browserAPI.getStorage(this.defaultSettings);
            this.updateUI(result);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.updateUI(this.defaultSettings);
        }
    }

    updateUI(settings) {
        // Update toggle switch for schedule helper only
        this.updateToggle('schedule-helper-toggle', settings.scheduleHelper);

        // Update language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = settings.language || 'uk';
        }
        this.updateLanguage(settings.language);
    }

    updateToggle(elementId, isActive) {
        const element = document.getElementById(elementId);
        if (isActive) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }

    async toggleSetting(settingKey) {
        try {
            const result = await browserAPI.getStorage([settingKey]);
            const newValue = !result[settingKey];

            await browserAPI.setStorage({ [settingKey]: newValue });
            this.updateToggle(`${settingKey.replace(/([A-Z])/g, '-$1').toLowerCase()}-toggle`, newValue);

            this.showStatusMessage(i18n.getMessage('settingUpdatedSuccess'), 'success');
        } catch (error) {
            console.error('Error toggling setting:', error);
            this.showStatusMessage(i18n.getMessage('errorUpdatingSetting'), 'error');
        }
    }

    async updateSetting(settingKey, value) {
        try {
            await browserAPI.setStorage({ [settingKey]: value });
            this.showStatusMessage(i18n.getMessage('settingUpdatedSuccess'), 'success');
        } catch (error) {
            console.error('Error updating setting:', error);
            this.showStatusMessage(i18n.getMessage('errorUpdatingSetting'), 'error');
        }
    }

    async updateLanguage(language) {
        try {
            await browserAPI.setStorage({ language: language });

            // Update the page language
            document.documentElement.lang = language;

            // Switch language and re-translate the page
            await i18n.switchLanguage(language);

            this.showStatusMessage(i18n.getMessage('languageChanged'), 'success');
        } catch (error) {
            console.error('Error updating language:', error);
            this.showStatusMessage(i18n.getMessage('errorUpdatingSetting'), 'error');
        }
    }

    async exportSettings() {
        try {
            const settings = await browserAPI.getStorage();
            const dataStr = JSON.stringify(settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `atlas-festival-helper-settings-${new Date().toISOString().split('T')[0]}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showStatusMessage(i18n.getMessage('settingsExportedSuccess'), 'success');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showStatusMessage(i18n.getMessage('errorExportingSettings'), 'error');
        }
    }

    async resetSettings() {
        if (confirm(i18n.getMessage('resetConfirmMessage'))) {
            await this.performReset();
        }
    }

    async performReset() {
        try {
            await browserAPI.clearStorage();
            await browserAPI.setStorage(this.defaultSettings);
            this.updateUI(this.defaultSettings);
            this.showStatusMessage(i18n.getMessage('settingsResetSuccess'), 'success');
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showStatusMessage(i18n.getMessage('errorResettingSettings'), 'error');
        }
    }

    showStatusMessage(message, type) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';

        // Hide message after 3 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

const options = new AtlasFestivalHelperOptions();

// Listen for storage changes to update UI
browserAPI.addStorageChangeListener(function (changes, namespace) {
    if (namespace === 'sync') {
        options.loadSettings();
    }
}); 