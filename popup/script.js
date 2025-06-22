const initializePopup = async () => {
    console.log('Atlas Festival Helper popup initialized');
    
    // Load current language setting
    try {
        const result = await browserAPI.getStorage('language');
        const currentLanguage = result.language || 'uk';
        document.documentElement.lang = currentLanguage;
    } catch (error) {
        console.error('Error loading language setting:', error);
        document.documentElement.lang = 'uk';
    }
    
    // Initialize i18n and wait for it to complete
    await i18n.init();
    i18n.initialize();
    
    // Update version text with translation
    document.querySelector('.footer p:last-child').textContent = i18n.getMessage('version');
}

const withErrorHandling = async (operation) => {
    try {
        await operation();
        window.close();
    } catch (error) {
        console.error('Error in operation:', error);
    }
}

const openAtlasSchedule = () => {
    return withErrorHandling(async () => {
        await browserAPI.createTab({ url: 'https://atlasfestival.com/schedule/' });
    });
}

const openOptions = () => {
    return withErrorHandling(async () => {
        await browserAPI.openOptionsPage();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
    document.getElementById('open-schedule').addEventListener('click', openAtlasSchedule);
    document.getElementById('open-options').addEventListener('click', openOptions);
});
