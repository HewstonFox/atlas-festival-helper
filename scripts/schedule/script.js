/**
 * Atlas Schedule Helper Script
 * Handles schedule filtering, conflict detection, and schedule building
 */

// Import shared components
// Note: In a Chrome extension context, we need to load these components via script tags
// The components will be available globally after the shared/components/components.js script is loaded

class AtlasScheduleHelper {
    constructor() {
        this.settings = {};
        this.favorites = [];
        this.stages = [];
        this.filteredEvents = [];
        this.scheduleData = [];
        this.conflicts = [];
        this.scheduleContainer = null;
        this.currentFilters = {
            showFavorites: false,
            selectedStages: []
        };
        this.conflictTimeout = 15; // Default 15 minutes
        this.scheduleTable = null;
        this.isScheduleShown = false; // Track if schedule is currently displayed
        this._conflictGroupsCache = null;
        this.init();
        this._patchDropdownOpen = false;
        console.log('Atlas Festival Helper - Schedule script initialized');
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
        await this.loadFavorites();
        this.waitForScheduleContent();
        this.setupStorageListener();
    }

    async loadSettings() {
        try {
            this.settings = await browserAPI.getStorage({
                scheduleHelper: true
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {
                scheduleHelper: true
            };
        }
    }

    async loadFavorites() {
        try {
            const result = await browserAPI.getStorage('atlasFavorites', []);
            this.favorites = result.atlasFavorites || [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.favorites = [];
        }
    }

    async saveFavorites() {
        try {
            await browserAPI.setStorage({ atlasFavorites: this.favorites });
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    waitForScheduleContent() {
        // Wait for the schedule content to load
        const checkInterval = setInterval(() => {
            const scheduleBlocks = document.querySelectorAll('.schedule_block');
            if (scheduleBlocks.length > 0) {
                clearInterval(checkInterval);
                this.processScheduleContent();
            }
        }, 1000);

        // Fallback timeout
        setTimeout(() => {
            clearInterval(checkInterval);
            if (document.querySelectorAll('.schedule_block').length === 0) {
                console.log('Schedule content not found, retrying...');
                this.waitForScheduleContent();
            }
        }, 10000);
    }

    processScheduleContent() {
        this.extractStages();
        
        // Only add favorite buttons and filtering controls if schedule helper is enabled
        if (this.settings.scheduleHelper) {
            this.addFavoriteButtons();
            this.addFilteringControls();
        }
        
        // Recompute conflicts after initial setup (only if schedule helper is enabled)
        if (this.settings.scheduleHelper) {
            this.recomputeConflicts();
        }

        // Reset schedule visibility when page content changes
        this.resetScheduleVisibility();
    }

    extractStages() {
        const stageTitles = document.querySelectorAll('.schedule_block_title');
        this.stages = Array.from(stageTitles).map(title => title.textContent.trim());
        console.log('Extracted stages:', this.stages);
    }

    getEventDataFromItem(item) {
        const link = item.querySelector('.schedule_link');
        const nameElement = item.querySelector('.schedule_name');
        const timeElement = item.querySelector('.schedule_time');
        const imageElement = item.querySelector('.schedule_img img');
        if (!link || !nameElement || !timeElement) return null;
        const eventName = nameElement.textContent.trim();
        const eventTime = timeElement.textContent.trim();
        const eventLink = link.href;
        const imageUrl = imageElement ? imageElement.src : '';
        const stageBlock = item.closest('.schedule_block');
        const stageTitle = stageBlock ? stageBlock.querySelector('.schedule_block_title')?.textContent.trim() : '';
        return {
            name: eventName,
            time: eventTime,
            link: eventLink,
            imageUrl: imageUrl,
            stage: stageTitle
        };
    }

    addFavoriteButtons() {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            return;
        }

        const scheduleItems = document.querySelectorAll('.schedule_item');
        scheduleItems.forEach(item => {
            if (item.querySelector('.favorite-btn')) return; // Already processed
            const eventData = this.getEventDataFromItem(item);
            if (!eventData) return;
            eventData.id = this.generateEventId(eventData.name, eventData.time, eventData.stage);
            // Create favorite button
            const favoriteBtn = this.createFavoriteButton(eventData);
            item.querySelector('.schedule_descr').prepend(favoriteBtn);
            // Update button state
            this.updateFavoriteButtonState(favoriteBtn, eventData.id);
        });
    }

    createFavoriteButton(eventData) {
        const btn = document.createElement('button');
        btn.className = 'favorite-btn';
        btn.innerHTML = '♡';
        btn.title = i18n.getMessage('addToFavorites');
        btn.dataset.eventId = eventData.id;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFavorite(eventData, btn);
        });

        return btn;
    }

    generateEventId(name, time, stage) {
        return `${name}_${time}_${stage}`
            .replace(/[^\p{L}\p{N}]+/gu, '_') // Replace non-letter/number chars with underscore
            .replace(/^_+|_+$/g, '');          // Trim leading/trailing underscores
    }

    toggleFavorite(eventData, button) {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            console.log('Schedule helper is disabled');
            return;
        }

        const eventId = eventData.id;
        const isFavorite = this.favorites.some(fav => fav.id === eventId);

        if (isFavorite) {
            // Remove from favorites
            this.favorites = this.favorites.filter(fav => fav.id !== eventId);
            button.innerHTML = '♡';
            button.title = i18n.getMessage('addToFavorites');
            button.classList.remove('favorite-active');
        } else {
            // Add to favorites
            this.favorites.push(eventData);
            button.innerHTML = '♥';
            button.title = i18n.getMessage('removeFromFavorites');
            button.classList.add('favorite-active');
        }

        this.saveFavorites();
        this.applyFilters();

        // Recompute conflicts when favorites change
        this.recomputeConflicts();
    }

    updateFavoriteButtonState(button, eventId) {
        const isFavorite = this.favorites.some(fav => fav.id === eventId);
        if (isFavorite) {
            button.innerHTML = '♥';
            button.title = i18n.getMessage('removeFromFavorites');
            button.classList.add('favorite-active');
        }
    }

    addFilteringControls() {
        // Find the schedule day list
        const scheduleDayList = document.querySelector('.schedule_day_list');
        if (!scheduleDayList) return;

        // Check if controls already exist
        if (document.querySelector('.atlas-filter-controls')) return;

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'atlas-filter-controls';
        controlsContainer.innerHTML = `
            <div class="filter-section">
                <h4>${i18n.getMessage('filterOptions')}</h4>
                <div class="filter-row">
                    <div class="filter-buttons" id="filter-buttons-container">
                        <!-- Filter buttons will be created by ButtonComponent -->
                    </div>
                    <div class="stage-filter-section">
                        <label class="stage-filter-label">${i18n.getMessage('stageFilter')}</label>
                        <div class="stage-dropdown-container" id="stage-dropdown-container"></div>
                    </div>
                </div>
            </div>
            <div class="filter-section">
                <h4>${i18n.getMessage('schedule')}</h4>
                <div class="filter-row">
                    <div class="schedule-controls">
                        <div class="conflict-timeout-section">
                            <label class="conflict-timeout-label">${i18n.getMessage('conflictTimeout')}</label>
                            <div class="conflict-timeout-dropdown-container" id="conflict-timeout-dropdown-container"></div>
                        </div>
                        <div id="build-schedule-btn-container">
                            <!-- Build schedule button will be created by ButtonComponent -->
                        </div>
                    </div>
                </div>
                <div class="schedule-table-container" id="schedule-table-container" style="display: none;">
                    <div class="schedule-table-wrapper">
                        <table class="schedule-table" id="schedule-table">
                            <thead>
                                <tr>
                                    <th>${i18n.getMessage('time')}</th>
                                    <th>${i18n.getMessage('artist')}</th>
                                    <th>${i18n.getMessage('stage')}</th>
                                </tr>
                            </thead>
                            <tbody id="schedule-table-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Insert after schedule day list
        scheduleDayList.parentNode.insertBefore(controlsContainer, scheduleDayList.nextSibling);

        // Create filter buttons using ButtonComponent
        this.createFilterButtons();

        // Create build schedule button using ButtonComponent
        this.createBuildScheduleButton();

        // Initialize dropdowns
        this.initializeDropdowns();

        // Add event listeners
        this.addFilterEventListeners();
    }

    createFilterButtons() {
        const filterButtonsContainer = document.getElementById('filter-buttons-container');
        if (!filterButtonsContainer) return;

        // Create favorites filter button
        this.favoritesFilterBtn = new ButtonComponent(filterButtonsContainer, {
            id: 'favorites-filter',
            text: i18n.getMessage('showFavoritesOnly'),
            icon: '♥',
            type: 'filter',
            onClick: () => {
                this.currentFilters.showFavorites = true;
                this.updateFilterButtons();
                this.applyFilters();
            }
        });

        // Create all events filter button
        this.allEventsFilterBtn = new ButtonComponent(filterButtonsContainer, {
            id: 'all-events-filter',
            text: i18n.getMessage('showAllArtists'),
            icon: '🎵',
            type: 'filter',
            active: true, // Default to active
            onClick: () => {
                this.currentFilters.showFavorites = false;
                this.updateFilterButtons();
                this.applyFilters();
            }
        });
    }

    createBuildScheduleButton() {
        const buildScheduleBtnContainer = document.getElementById('build-schedule-btn-container');
        if (!buildScheduleBtnContainer) return;

        // Create print/export PDF button first
        this.printScheduleBtn = new ButtonComponent(buildScheduleBtnContainer, {
            id: 'print-schedule-btn',
            text: i18n.getMessage('printExportPDF') || 'Export PDF',
            icon: '🖨️',
            type: 'print-schedule',
            onClick: () => {
                this.printScheduleTable();
            }
        });

        // Create build schedule button
        this.buildScheduleBtn = new ButtonComponent(buildScheduleBtnContainer, {
            id: 'build-schedule-btn',
            text: i18n.getMessage('buildSchedule'),
            icon: '📅',
            type: 'build-schedule',
            onClick: () => {
                this.buildSchedule();
            }
        });
    }

    initializeDropdowns() {
        // Initialize stage dropdown
        const stageContainer = document.getElementById('stage-dropdown-container');
        if (stageContainer) {
            const stageOptions = this.stages.map(stage => ({
                value: stage,
                label: stage,
                selected: true
            }));

            this.stageDropdown = new GenericDropdown(stageContainer, {
                isMultiple: true,
                isAtLeastOneRequired: true,
                options: stageOptions,
                beginContent: `<button class="stage-dropdown-btn" id="select-all-stages">${i18n.getMessage('selectAll')}</button>`,
                placeholder: i18n.getMessage('allStages'),
                onChange: (selectedValues) => {
                    this.currentFilters.selectedStages = selectedValues;
                    this.applyFilters();
                }
            });

            // Add event listener for Select All button
            this.attachSelectAllListener();

            // Patch dropdown open to always re-attach event
            if (!this._patchDropdownOpen) {
                const origOpen = this.stageDropdown.open.bind(this.stageDropdown);
                this.stageDropdown.open = () => {
                    origOpen();
                    this.attachSelectAllListener();
                };
                this._patchDropdownOpen = true;
            }
        }

        // Initialize conflict timeout dropdown
        const timeoutContainer = document.getElementById('conflict-timeout-dropdown-container');
        if (timeoutContainer) {
            const timeoutOptions = [
                { value: '5', label: '5 min' },
                { value: '10', label: '10 min' },
                { value: '15', label: '15 min' },
                { value: '20', label: '20 min' },
                { value: '25', label: '25 min' },
                { value: '30', label: '30 min' }
            ];

            this.timeoutDropdown = new GenericDropdown(timeoutContainer, {
                isMultiple: false,
                options: timeoutOptions,
                placeholder: i18n.getMessage('selectTimeout'),
                onChange: (selectedValue) => {
                    this.conflictTimeout = parseInt(selectedValue);
                    this.recomputeConflicts();
                }
            });

            // Set default value
            this.timeoutDropdown.setValue('15');
        }
    }

    addFilterEventListeners() {
        // Event listeners are now handled by ButtonComponent instances
        // Just update the initial button states
        this.updateFilterButtons();
    }

    updateFilterButtons() {
        // Update filter button states using ButtonComponent instances
        if (this.favoritesFilterBtn && this.allEventsFilterBtn) {
            if (this.currentFilters.showFavorites) {
                this.favoritesFilterBtn.setActive(true);
                this.allEventsFilterBtn.setActive(false);
            } else {
                this.favoritesFilterBtn.setActive(false);
                this.allEventsFilterBtn.setActive(true);
            }
        }
    }

    applyFilters() {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            // Show all items if schedule helper is disabled
            const scheduleItems = document.querySelectorAll('.schedule_item');
            scheduleItems.forEach(item => {
                item.style.display = '';
            });
            const stageBlocks = document.querySelectorAll('.schedule_block');
            stageBlocks.forEach(block => {
                block.style.display = '';
            });
            return;
        }

        const scheduleItems = document.querySelectorAll('.schedule_item');
        scheduleItems.forEach(item => {
            const eventData = this.getEventDataFromItem(item);
            if (!eventData) return;
            const eventId = this.generateEventId(eventData.name, eventData.time, eventData.stage);
            let shouldShow = true;
            // Check favorites filter
            if (this.currentFilters.showFavorites) {
                shouldShow = this.favorites.some(fav => fav.id === eventId);
            }
            // Check stage filter
            if (shouldShow && this.currentFilters.selectedStages.length > 0) {
                shouldShow = this.currentFilters.selectedStages.includes(eventData.stage);
            }
            // Show/hide item
            item.style.display = shouldShow ? '' : 'none';
        });
        // Show/hide stage blocks based on whether they have visible items
        const stageBlocks = document.querySelectorAll('.schedule_block');
        stageBlocks.forEach(block => {
            const visibleItems = block.querySelectorAll('.schedule_item:not([style*="display: none"])');
            block.style.display = visibleItems.length > 0 ? '' : 'none';
        });
        // Recompute conflicts when filters change (only if schedule helper is enabled)
        if (this.settings.scheduleHelper) {
            this.recomputeConflicts();
        }
    }

    /**
     * Computes and caches conflict groups for the current schedule data and conflicts.
     * Returns an array of groups with events, conflict status, and color info.
     */
    computeConflictGroups(scheduleData, conflicts) {
        // If already cached for this scheduleData/conflicts, return cached
        if (
            this._conflictGroupsCache &&
            this._conflictGroupsCache.scheduleData === scheduleData &&
            this._conflictGroupsCache.conflicts === conflicts
        ) {
            return this._conflictGroupsCache.groups;
        }
        // Sort all events by time
        const sortedEvents = [...scheduleData].sort((a, b) => a.minutes - b.minutes);
        const groups = [];
        let currentGroup = [];
        let groupStartTime = null;
        for (let event of sortedEvents) {
            if (currentGroup.length === 0) {
                currentGroup.push(event);
                groupStartTime = event.minutes;
            } else {
                if (event.minutes - groupStartTime <= this.conflictTimeout) {
                    currentGroup.push(event);
                } else {
                    groups.push({
                        events: [...currentGroup],
                        hasConflict: currentGroup.length > 1
                    });
                    currentGroup = [event];
                    groupStartTime = event.minutes;
                }
            }
        }
        if (currentGroup.length > 0) {
            groups.push({
                events: [...currentGroup],
                hasConflict: currentGroup.length > 1
            });
        }
        // Assign color classes only to groups with conflicts
        const conflictColors = [
            '--conflict-blue',
            '--conflict-purple',
            '--conflict-yellow',
            '--conflict-brown',
            '--conflict-black',
            '--conflict-neongreen',
        ];
        let colorIndex = 0;
        for (let group of groups) {
            if (group.hasConflict) {
                group.colorVar = conflictColors[colorIndex % conflictColors.length];
                colorIndex++;
            }
        }
        // Cache
        this._conflictGroupsCache = { scheduleData, conflicts, groups };
        return groups;
    }

    getCurrentScheduleContext() {
        // Get all currently visible events on the page
        const visibleEvents = this.getVisibleEventsOnPage();
        // Filter favorites to only include artists that are currently on the page
        const filteredFavorites = this.favorites.filter(favorite => {
            return visibleEvents.some(event => event.id === favorite.id);
        });
        // Parse times and create schedule
        const scheduleData = this.parseScheduleData(filteredFavorites);
        // Detect conflicts
        const conflicts = this.detectConflicts(scheduleData);
        // Invalidate cache
        this._conflictGroupsCache = null;
        // Precompute and cache groups for this context
        this.computeConflictGroups(scheduleData, conflicts);
        return { filteredFavorites, scheduleData, conflicts };
    }

    buildSchedule() {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            console.log('Schedule helper is disabled');
            return;
        }

        const tableContainer = document.getElementById('schedule-table-container');

        // If schedule is already shown, hide it and return
        if (this.isScheduleShown) {
            tableContainer.style.display = 'none';
            this.isScheduleShown = false;
            if (this.buildScheduleBtn) {
                this.buildScheduleBtn.setText(i18n.getMessage('buildSchedule'));
                this.buildScheduleBtn.setIcon('📅');
            }
            return;
        }

        // Clear previous conflict highlighting
        this.clearConflictHighlighting();

        // Get current context
        const { scheduleData, conflicts } = this.getCurrentScheduleContext();

        // Highlight conflicts in main list
        this.highlightConflicts(scheduleData, conflicts);

        // Generate and display schedule table
        this.generateScheduleTable(scheduleData, conflicts);

        // Update button text to show "Hide Schedule"
        if (this.buildScheduleBtn) {
            this.buildScheduleBtn.setText(i18n.getMessage('hideSchedule'));
            this.buildScheduleBtn.setIcon('👁️');
        }
    }

    getVisibleEventsOnPage() {
        const visibleEvents = [];
        const scheduleItems = document.querySelectorAll('.schedule_item');
        scheduleItems.forEach(item => {
            const eventData = this.getEventDataFromItem(item);
            if (!eventData) return;
            const eventId = this.generateEventId(eventData.name, eventData.time, eventData.stage);
            visibleEvents.push({
                id: eventId,
                name: eventData.name,
                time: eventData.time,
                stage: eventData.stage
            });
        });
        return visibleEvents;
    }

    parseScheduleData(favorites = null) {
        const dataToParse = favorites || this.favorites;

        return dataToParse.map(favorite => {
            const timeStr = favorite.time;
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);

            if (!timeMatch) {
                return {
                    ...favorite,
                    parsedTime: null,
                    minutes: 0
                };
            }

            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const totalMinutes = hours * 60 + minutes;

            return {
                ...favorite,
                parsedTime: timeStr,
                minutes: totalMinutes
            };
        }).filter(item => item.parsedTime !== null)
            .sort((a, b) => a.minutes - b.minutes);
    }

    detectConflicts(scheduleData) {
        const conflicts = [];

        for (let i = 0; i < scheduleData.length; i++) {
            for (let j = i + 1; j < scheduleData.length; j++) {
                const timeDiff = Math.abs(scheduleData[j].minutes - scheduleData[i].minutes);

                if (timeDiff <= this.conflictTimeout) {
                    conflicts.push({
                        event1: scheduleData[i],
                        event2: scheduleData[j],
                        timeDiff: timeDiff
                    });
                }
            }
        }

        return conflicts;
    }

    highlightConflicts(scheduleData, conflicts) {
        this.clearConflictHighlighting();
        if (conflicts.length === 0) return;
        const groups = this.computeConflictGroups(scheduleData, conflicts);
        const scheduleItems = document.querySelectorAll('.schedule_item');
        groups.forEach(group => {
            if (!group.hasConflict) return;
            group.events.forEach(event => {
                scheduleItems.forEach(item => {
                    const eventData = this.getEventDataFromItem(item);
                    if (!eventData) return;
                    const currentEventId = this.generateEventId(eventData.name, eventData.time, eventData.stage);
                    if (currentEventId === event.id) {
                        const timeElement = item.querySelector('.schedule_time');
                        if (timeElement) {
                            timeElement.classList.add('conflict-highlight');
                            if (group.colorVar) {
                                timeElement.style.setProperty('--conflict-group-bg', `var(${group.colorVar})`);
                            }
                        }
                    }
                });
            });
        });
    }

    clearConflictHighlighting() {
        const conflictedTimes = document.querySelectorAll('.conflict-highlight');
        conflictedTimes.forEach(element => {
            element.classList.remove('conflict-highlight');
            element.style.setProperty('--conflict-group-bg', 'transparent');
            element.style.setProperty('--conflict-group-color', 'transparent');
        });
    }

    generateScheduleTable(scheduleData, conflicts) {
        const tableContainer = document.getElementById('schedule-table-container');
        const tableBody = document.getElementById('schedule-table-body');
        if (!tableContainer || !tableBody) return;
        tableBody.innerHTML = '';
        // Use cached groups
        const groups = this.computeConflictGroups(scheduleData, conflicts);
        groups.forEach(group => {
            if (group.events.length === 1) {
                const event = group.events[0];
                const row = this.createTableRow(event, false);
                tableBody.appendChild(row);
            } else {
                group.events.forEach((event, index) => {
                    const row = this.createTableRow(event, true, index === 0 ? group.events.length : 0, group.colorVar);
                    tableBody.appendChild(row);
                });
            }
        });
        tableContainer.style.display = 'block';
        this.isScheduleShown = true;
    }

    createTableRow(event, isConflict, conflictCount = 0, colorVar = '') {
        const row = document.createElement('tr');
        row.className = isConflict ? `conflict-row` : '';
        row.style.setProperty('--conflict-group-bg', `var(${colorVar})`);

        const timeCell = document.createElement('td');
        timeCell.textContent = event.time;
        timeCell.className = 'time';

        const artistCell = document.createElement('td');
        artistCell.textContent = event.name;
        artistCell.className = 'artist';

        const stageCell = document.createElement('td');
        stageCell.textContent = event.stage;
        stageCell.className = 'stage';

        row.appendChild(timeCell);
        row.appendChild(artistCell);
        row.appendChild(stageCell);

        return row;
    }

    recomputeConflicts() {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            this.clearConflictHighlighting();
            return;
        }

        if (this.favorites.length === 0) {
            this.clearConflictHighlighting();
            // Hide schedule table if no favorites
            const tableContainer = document.getElementById('schedule-table-container');
            if (tableContainer) {
                tableContainer.style.display = 'none';
                this.isScheduleShown = false;
                if (this.buildScheduleBtn) {
                    this.buildScheduleBtn.setText(i18n.getMessage('buildSchedule'));
                    this.buildScheduleBtn.setIcon('📅');
                }
            }
            return;
        }

        // Get current context
        const { filteredFavorites, scheduleData, conflicts } = this.getCurrentScheduleContext();

        if (filteredFavorites.length === 0) {
            this.clearConflictHighlighting();
            // Hide schedule table if no favorites on current page
            const tableContainer = document.getElementById('schedule-table-container');
            if (tableContainer) {
                tableContainer.style.display = 'none';
                this.isScheduleShown = false;
                if (this.buildScheduleBtn) {
                    this.buildScheduleBtn.setText(i18n.getMessage('buildSchedule'));
                    this.buildScheduleBtn.setIcon('📅');
                }
            }
            return;
        }

        // Highlight conflicts in main list
        this.highlightConflicts(scheduleData, conflicts);

        // If schedule table is currently shown, rebuild it with new data
        if (this.isScheduleShown) {
            this.generateScheduleTable(scheduleData, conflicts);
        }
    }

    resetScheduleVisibility() {
        const tableContainer = document.getElementById('schedule-table-container');

        if (tableContainer && this.isScheduleShown) {
            tableContainer.style.display = 'none';
            this.isScheduleShown = false;
            if (this.buildScheduleBtn) {
                this.buildScheduleBtn.setText(i18n.getMessage('buildSchedule'));
                this.buildScheduleBtn.setIcon('📅');
            }
        }
    }

    setupStorageListener() {
        browserAPI.addStorageChangeListener((changes, namespace) => {
            // Check if atlasFavorites changed
            if (changes.atlasFavorites) {
                const newFavorites = changes.atlasFavorites.newValue || [];
                const oldFavorites = changes.atlasFavorites.oldValue || [];

                // Only update if the favorites actually changed
                if (JSON.stringify(newFavorites) !== JSON.stringify(oldFavorites)) {
                    this.favorites = newFavorites;

                    // Update all favorite button states
                    this.updateAllFavoriteButtonStates();

                    // Recompute conflicts and rebuild schedule if needed
                    this.recomputeConflicts();
                }
            }

            // Check if schedule-related settings changed
            if (changes.scheduleHelper) {
                // Reload settings to get updated values
                this.loadSettings().then(() => {
                    // React to scheduleHelper setting change
                    if (changes.scheduleHelper) {
                        const newScheduleHelper = changes.scheduleHelper.newValue;
                        this.handleScheduleHelperChange(newScheduleHelper);
                    }
                });
            }

            // Check if language changed
            if (changes.language) {
                const newLanguage = changes.language.newValue;
                this.handleLanguageChange(newLanguage);
            }
        });
    }

    handleScheduleHelperChange(enabled) {
        console.log('Schedule helper setting changed:', enabled);
        
        if (enabled) {
            // Re-enable schedule functionality
            this.processScheduleContent();
        } else {
            // Disable schedule functionality
            this.disableScheduleFeatures();
        }
    }

    handleLanguageChange(newLanguage) {
        console.log('Language setting changed:', newLanguage);
        
        // Update document language
        document.documentElement.lang = newLanguage;
        
        // Re-initialize i18n with new language
        i18n.switchLanguage(newLanguage).then(() => {
            // Re-translate UI elements
            this.updateUITranslations();
        });
    }

    disableScheduleFeatures() {
        // Remove favorite buttons
        const favoriteButtons = document.querySelectorAll('.favorite-btn');
        favoriteButtons.forEach(btn => btn.remove());

        // Remove filtering controls
        const filterControls = document.querySelector('.atlas-filter-controls');
        if (filterControls) {
            filterControls.remove();
        }

        // Hide schedule table if shown
        const tableContainer = document.getElementById('schedule-table-container');
        if (tableContainer) {
            tableContainer.style.display = 'none';
            this.isScheduleShown = false;
        }

        // Clear conflict highlighting
        this.clearConflictHighlighting();

        console.log('Schedule features disabled');
    }

    updateUITranslations() {
        // Update filter controls translations
        const filterControls = document.querySelector('.atlas-filter-controls');
        if (filterControls) {
            const filterTitle = filterControls.querySelector('h4');
            if (filterTitle) {
                filterTitle.textContent = i18n.getMessage('filterOptions');
            }

            const scheduleTitle = filterControls.querySelectorAll('h4')[1];
            if (scheduleTitle) {
                scheduleTitle.textContent = i18n.getMessage('schedule');
            }

            // Update button texts
            if (this.favoritesFilterBtn) {
                this.favoritesFilterBtn.setText(i18n.getMessage('showFavoritesOnly'));
            }
            if (this.allEventsFilterBtn) {
                this.allEventsFilterBtn.setText(i18n.getMessage('showAllArtists'));
            }
            if (this.buildScheduleBtn) {
                this.buildScheduleBtn.setText(this.isScheduleShown ? 
                    i18n.getMessage('hideSchedule') : 
                    i18n.getMessage('buildSchedule'));
            }
            if (this.printScheduleBtn) {
                this.printScheduleBtn.setText(i18n.getMessage('printExportPDF') || 'Export PDF');
            }

            // Update labels
            const stageFilterLabel = filterControls.querySelector('.stage-filter-label');
            if (stageFilterLabel) {
                stageFilterLabel.textContent = i18n.getMessage('stageFilter');
            }

            const conflictTimeoutLabel = filterControls.querySelector('.conflict-timeout-label');
            if (conflictTimeoutLabel) {
                conflictTimeoutLabel.textContent = i18n.getMessage('conflictTimeout');
            }

            // Update dropdown placeholders
            if (this.stageDropdown) {
                this.stageDropdown.setPlaceholder(i18n.getMessage('allStages'));
                this.stageDropdown.setBeginContent(`<button class=\"stage-dropdown-btn\" id=\"select-all-stages\">${i18n.getMessage('selectAll')}</button>`);
                this.attachSelectAllListener();
            }
            if (this.timeoutDropdown) {
                this.timeoutDropdown.setPlaceholder(i18n.getMessage('selectTimeout'));
            }
        }

        // Update favorite button tooltips
        const favoriteButtons = document.querySelectorAll('.favorite-btn');
        favoriteButtons.forEach(button => {
            const eventId = button.dataset.eventId;
            if (eventId) {
                const isFavorite = this.favorites.some(fav => fav.id === eventId);
                button.title = isFavorite ? 
                    i18n.getMessage('removeFromFavorites') : 
                    i18n.getMessage('addToFavorites');
            }
        });

        console.log('UI translations updated');
    }

    updateAllFavoriteButtonStates() {
        const favoriteButtons = document.querySelectorAll('.favorite-btn');
        favoriteButtons.forEach(button => {
            const eventId = button.dataset.eventId;
            if (eventId) {
                this.updateFavoriteButtonState(button, eventId);
            }
        });
    }

    printScheduleTable() {
        // Check if schedule helper is enabled
        if (!this.settings.scheduleHelper) {
            console.log('Schedule helper is disabled');
            return;
        }

        const { scheduleData, conflicts } = this.getCurrentScheduleContext();
        if (!scheduleData || scheduleData.length === 0) {
            alert(i18n.getMessage('noScheduleToPrint') || 'No schedule to print.');
            return;
        }

        // Always generate the print layout from current schedule data, not from the visible table
        // Remove any previous print container
        let printContainer = document.getElementById('atlas-print-container');
        if (printContainer) {
            printContainer.remove();
        }
        printContainer = document.createElement('div');
        printContainer.id = 'atlas-print-container';
        document.body.appendChild(printContainer);

        // Get current context (favorites on current page)
        
        
        // Get the current date from the active day link
        const activeDayLink = document.querySelector('.schedule_day_link.active');
        const currentDate = activeDayLink ? activeDayLink.textContent.trim() : '';
        
         
        // Use conflict groups to organize the schedule
        const groups = this.computeConflictGroups(scheduleData, conflicts);
        
        // Render as a mobile-friendly card/list layout with conflict indicators
        printContainer.innerHTML = `
            <div class="print-header">
                <div class="print-title">${i18n.getMessage('yourSchedule', [currentDate]) || `Atlas Festival schedule for ${currentDate}`}</div>
            </div>
            <div class="print-schedule-list">
                ${groups.map(group => {
                    if (group.events.length === 1) {
                        // Single event - no conflict
                        const event = group.events[0];
                        return `
                            <div class="print-schedule-card">
                                <div class="print-time">${event.time}</div>
                                <div class="print-artist">${event.name}</div>
                                <div class="print-stage">${event.stage}</div>
                            </div>
                        `;
                    } else {
                        // Multiple events - conflict group
                        return `
                            <div class="print-conflict-group">
                                <div class="print-conflict-header">
                                    <div class="print-conflict-indicator">🔥 ${i18n.getMessage('conflict') || 'CONFLICT'}</div>
                                </div>
                                ${group.events.map((event, index) => `
                                    <div class="print-schedule-card print-conflict-card" style="--conflict-color: var(${group.colorVar || '--conflict-blue'});">
                                        <div class="print-time">${event.time}</div>
                                        <div class="print-artist">${event.name}</div>
                                        <div class="print-stage">${event.stage}</div>
                                        <div class="print-conflict-number">${index + 1}</div>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;

        // Add a class to body to trigger print styles
        document.body.classList.add('printing-schedule');
        // Print only the print container
        window.print();
        // Clean up after printing
        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing-schedule');
            if (printContainer) printContainer.remove();
        }, { once: true });
    }

    // Helper to attach Select All event listener
    attachSelectAllListener() {
        const stageContainer = document.getElementById('stage-dropdown-container');
        if (stageContainer) {
            const selectAllBtn = stageContainer.querySelector('#select-all-stages');
            if (selectAllBtn) {
                selectAllBtn.onclick = null; // Remove previous
                selectAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const allValues = this.stages;
                    this.stageDropdown.setValue(allValues);
                });
            }
        }
    }
}

new AtlasScheduleHelper();
