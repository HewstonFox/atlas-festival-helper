/**
 * Browser API Facade
 * Provides a unified interface for browser extension APIs
 * Supports Chrome, Firefox, and Safari extensions
 */


class BrowserAPI {
    constructor() {
        this.browser = this.detectBrowser();
        this.api = this.getBrowserAPI();
    }

    /**
     * Detect the current browser
     * @returns {string} 'chrome', 'firefox', or 'safari'
     */
    detectBrowser() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            return 'chrome';
        } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
            return 'firefox';
        } else if (typeof safari !== 'undefined' && safari.extension) {
            return 'safari';
        } else {
            throw new Error('Browser extension API not available');
        }
    }

    /**
     * Get the appropriate browser API object
     * @returns {object} Chrome, Firefox, or Safari API object
     */
    getBrowserAPI() {
        switch (this.browser) {
            case 'chrome':
                return chrome;
            case 'firefox':
                return browser;
            case 'safari':
                return safari;
            default:
                throw new Error('Unsupported browser');
        }
    }

    /**
     * Create a new tab
     * @param {object} options - Tab creation options
     * @returns {Promise} Promise that resolves when tab is created
     */
    async createTab(options) {
        try {
            if (this.browser === 'chrome') {
                return await this.api.tabs.create(options);
            } else if (this.browser === 'firefox') {
                return await this.api.tabs.create(options);
            } else if (this.browser === 'safari') {
                return await this.api.tabs.create(options);
            }
        } catch (error) {
            console.error('Error creating tab:', error);
            throw error;
        }
    }

    /**
     * Open the options page
     * @returns {Promise} Promise that resolves when options page is opened
     */
    async openOptionsPage() {
        try {
            if (this.browser === 'chrome') {
                return await this.api.runtime.openOptionsPage();
            } else if (this.browser === 'firefox') {
                return await this.api.runtime.openOptionsPage();
            } else if (this.browser === 'safari') {
                return await this.api.runtime.openOptionsPage();
            }
        } catch (error) {
            console.error('Error opening options page:', error);
            throw error;
        }
    }

    /**
     * Get data from storage
     * @param {string|array|object} keys - Keys to retrieve
     * @param {object} defaultValue - Default value if key doesn't exist
     * @returns {Promise<object>} Promise that resolves with stored data
     */
    async getStorage(keys, defaultValue = null) {
        try {
            if (this.browser === 'chrome') {
                return await this.api.storage.sync.get(keys);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.storage.sync.get which returns a Promise
                return await this.api.storage.sync.get(keys);
            } else if (this.browser === 'safari') {
                // Safari uses localStorage for extension storage
                const result = {};
                if (typeof keys === 'string') {
                    const value = localStorage.getItem(keys);
                    result[keys] = value ? JSON.parse(value) : defaultValue;
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        const value = localStorage.getItem(key);
                        result[key] = value ? JSON.parse(value) : defaultValue;
                    });
                } else if (typeof keys === 'object') {
                    Object.keys(keys).forEach(key => {
                        const value = localStorage.getItem(key);
                        result[key] = value ? JSON.parse(value) : keys[key];
                    });
                }
                return result;
            }
        } catch (error) {
            console.error('Error getting storage:', error);
            throw error;
        }
    }

    /**
     * Set data in storage
     * @param {object} items - Items to store
     * @returns {Promise} Promise that resolves when data is stored
     */
    async setStorage(items) {
        try {
            if (this.browser === 'chrome') {
                return await this.api.storage.sync.set(items);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.storage.sync.set which returns a Promise
                return await this.api.storage.sync.set(items);
            } else if (this.browser === 'safari') {
                // Safari uses localStorage for extension storage
                Object.keys(items).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(items[key]));
                });
                return Promise.resolve();
            }
        } catch (error) {
            console.error('Error setting storage:', error);
            throw error;
        }
    }

    /**
     * Remove data from storage
     * @param {string|array} keys - Keys to remove
     * @returns {Promise} Promise that resolves when data is removed
     */
    async removeStorage(keys) {
        try {
            if (this.browser === 'chrome') {
                return await this.api.storage.sync.remove(keys);
            } else if (this.browser === 'firefox') {
                return await this.api.storage.sync.remove(keys);
            } else if (this.browser === 'safari') {
                return await this.api.storage.sync.remove(keys);
            }
        } catch (error) {
            console.error('Error removing storage:', error);
            throw error;
        }
    }

    /**
     * Clear all data from storage
     * @returns {Promise} Promise that resolves when storage is cleared
     */
    async clearStorage() {
        try {
            if (this.browser === 'chrome') {
                return await this.api.storage.sync.clear();
            } else if (this.browser === 'firefox') {
                return await this.api.storage.sync.clear();
            } else if (this.browser === 'safari') {
                localStorage.clear();
                return Promise.resolve();
            }
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    /**
     * Get internationalized message
     * @param {string} key - Message key
     * @param {array} substitutions - Substitution parameters
     * @returns {string} Localized message
     */
    getI18nMessage(key, substitutions = []) {
        try {
            if (this.browser === 'chrome') {
                return this.api.i18n.getMessage(key, substitutions);
            } else if (this.browser === 'firefox') {
                return this.api.i18n.getMessage(key, substitutions);
            } else if (this.browser === 'safari') {
                // Safari doesn't have built-in i18n, so we'll return the key as fallback
                console.warn('Safari i18n not implemented, returning key:', key);
                return key;
            }
        } catch (error) {
            console.warn(`Error getting i18n message for key: ${key}`, error);
            return key;
        }
    }

    /**
     * Get internationalized message with custom locale support
     * @param {string} key - Message key
     * @param {array} substitutions - Substitution parameters
     * @param {string} locale - Locale to use (optional, defaults to current)
     * @returns {Promise<string>} Promise that resolves to localized message
     */
    async getI18nMessageWithLocale(key, substitutions = [], locale = null) {
        try {
            // If no locale specified, try to get from storage
            if (!locale) {
                const result = await this.getStorage('language');
                locale = result.language || 'uk';
            }

            // Try to load messages from the locale file
            const extensionUrl = this.getURL(`_locales/${locale}/messages.json`);
            const response = await fetch(extensionUrl);
            
            if (response.ok) {
                const messages = await response.json();
                if (messages[key] && messages[key].message) {
                    let message = messages[key].message;
                    
                    // Handle substitutions
                    if (substitutions && substitutions.length > 0) {
                        substitutions.forEach((sub, index) => {
                            message = message.replace(`$${index + 1}`, sub);
                        });
                    }
                    
                    return message;
                }
            }
            
            // Fallback to browser API
            return this.getI18nMessage(key, substitutions);
        } catch (error) {
            console.warn(`Error getting i18n message for key: ${key}`, error);
            return key;
        }
    }

    /**
     * Get the extension manifest
     * @returns {Promise<object>} Promise that resolves to the manifest object
     */
    async getManifest() {
        try {
            if (this.browser === 'chrome') {
                return await this.api.runtime.getManifest();
            } else if (this.browser === 'firefox') {
                return await this.api.runtime.getManifest();
            } else if (this.browser === 'safari') {
                return await this.api.runtime.getManifest();
            }
        } catch (error) {
            console.error('Error getting manifest:', error);
            throw error;
        }
    }

    /**
     * Add a listener for storage changes
     * @param {function} callback - Function to call when storage changes
     */
    addStorageChangeListener(callback) {
        try {
            if (this.browser === 'chrome') {
                this.api.storage.onChanged.addListener(callback);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.storage.onChanged.addListener
                this.api.storage.onChanged.addListener(callback);
            } else if (this.browser === 'safari') {
                // Safari doesn't have built-in storage change events
                // We can implement a custom solution using window events
                window.addEventListener('storage', (event) => {
                    callback({
                        [event.key]: {
                            oldValue: event.oldValue ? JSON.parse(event.oldValue) : undefined,
                            newValue: event.newValue ? JSON.parse(event.newValue) : undefined
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error adding storage change listener:', error);
            throw error;
        }
    }

    /**
     * Remove a listener for storage changes
     * @param {function} callback - Function to remove
     */
    removeStorageChangeListener(callback) {
        try {
            if (this.browser === 'chrome') {
                this.api.storage.onChanged.removeListener(callback);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.storage.onChanged.removeListener
                this.api.storage.onChanged.removeListener(callback);
            } else if (this.browser === 'safari') {
                // Safari doesn't have built-in storage change events
                // Remove the custom event listener
                window.removeEventListener('storage', callback);
            }
        } catch (error) {
            console.error('Error removing storage change listener:', error);
            throw error;
        }
    }

    /**
     * Get the current browser name
     * @returns {string} Browser name
     */
    getBrowserName() {
        return this.browser;
    }

    /**
     * Check if the current browser is Chrome
     * @returns {boolean} True if Chrome
     */
    isChrome() {
        return this.browser === 'chrome';
    }

    /**
     * Check if the current browser is Firefox
     * @returns {boolean} True if Firefox
     */
    isFirefox() {
        return this.browser === 'firefox';
    }

    /**
     * Check if the current browser is Safari
     * @returns {boolean} True if Safari
     */
    isSafari() {
        return this.browser === 'safari';
    }

    /**
     * Get the extension's runtime ID
     * @returns {string} Extension ID
     */
    getExtensionId() {
        if (this.browser === 'safari') {
            return safari.extension.settings.identifier;
        }
        return this.api.runtime.id;
    }

    /**
     * Get the URL for an extension resource
     * @param {string} path - Path to the resource relative to extension root
     * @returns {string} Full URL to the extension resource
     */
    getURL(path) {
        try {
            if (this.browser === 'chrome') {
                return this.api.runtime.getURL(path);
            } else if (this.browser === 'firefox') {
                return this.api.runtime.getURL(path);
            } else if (this.browser === 'safari') {
                // Safari uses a different approach for extension URLs
                return safari.extension.baseURI + path;
            }
        } catch (error) {
            console.error('Error getting URL:', error);
            throw error;
        }
    }

    /**
     * Send a message to another part of the extension
     * @param {string} target - Target (e.g., 'background', 'content-script')
     * @param {object} message - Message to send
     * @returns {Promise} Promise that resolves with the response
     */
    async sendMessage(target, message) {
        try {
            if (this.browser === 'chrome') {
                return await this.api.runtime.sendMessage(message);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.runtime.sendMessage which returns a Promise
                return await this.api.runtime.sendMessage(message);
            } else if (this.browser === 'safari') {
                // Safari doesn't have a built-in messaging system
                // We can use postMessage for communication between contexts
                return new Promise((resolve, reject) => {
                    const messageId = Date.now().toString();
                    const messageWithId = { ...message, _id: messageId };

                    // Set up a one-time listener for the response
                    const responseHandler = (event) => {
                        if (event.data && event.data._id === messageId) {
                            window.removeEventListener('message', responseHandler);
                            resolve(event.data.response);
                        }
                    };

                    window.addEventListener('message', responseHandler);
                    window.postMessage(messageWithId, '*');

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        window.removeEventListener('message', responseHandler);
                        reject(new Error('Message timeout'));
                    }, 5000);
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Add a listener for runtime messages
     * @param {function} callback - Function to call when message is received
     */
    addMessageListener(callback) {
        try {
            if (this.browser === 'chrome') {
                this.api.runtime.onMessage.addListener(callback);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.runtime.onMessage.addListener
                this.api.runtime.onMessage.addListener(callback);
            } else if (this.browser === 'safari') {
                // Safari doesn't have a built-in messaging system
                // We can use postMessage for communication between contexts
                window.addEventListener('message', (event) => {
                    if (event.data && event.data._id) {
                        // This is a message with an ID, handle it
                        const response = callback(event.data);
                        if (response && typeof response.then === 'function') {
                            // If callback returns a promise
                            response.then(result => {
                                window.postMessage({
                                    _id: event.data._id,
                                    response: result
                                }, '*');
                            });
                        } else {
                            // If callback returns a direct value
                            window.postMessage({
                                _id: event.data._id,
                                response: response
                            }, '*');
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error adding message listener:', error);
            throw error;
        }
    }

    /**
     * Remove a listener for runtime messages
     * @param {function} callback - Function to remove
     */
    removeMessageListener(callback) {
        try {
            if (this.browser === 'chrome') {
                this.api.runtime.onMessage.removeListener(callback);
            } else if (this.browser === 'firefox') {
                // Firefox uses browser.runtime.onMessage.removeListener
                this.api.runtime.onMessage.removeListener(callback);
            } else if (this.browser === 'safari') {
                // Safari doesn't have a built-in messaging system
                // Remove the custom event listener
                window.removeEventListener('message', callback);
            }
        } catch (error) {
            console.error('Error removing message listener:', error);
            throw error;
        }
    }
}

const browserAPI = new BrowserAPI();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserAPI;
} else {
    window.browserAPI = browserAPI;
} 