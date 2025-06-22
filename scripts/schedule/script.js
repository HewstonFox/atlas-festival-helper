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
        this.init();
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
                scheduleHelper: true,
                eventFiltering: true
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = {
                scheduleHelper: true,
                eventFiltering: true
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
        this.addFavoriteButtons();
        this.addFilteringControls();
        this.applyFilters();
        // Recompute conflicts after initial setup
        this.recomputeConflicts();
        
        // Reset schedule visibility when page content changes
        this.resetScheduleVisibility();
    }

    extractStages() {
        const stageTitles = document.querySelectorAll('.schedule_block_title');
        this.stages = Array.from(stageTitles).map(title => title.textContent.trim());
        console.log('Extracted stages:', this.stages);
    }

    addFavoriteButtons() {
        const scheduleItems = document.querySelectorAll('.schedule_item');
        
        scheduleItems.forEach(item => {
            if (item.querySelector('.favorite-btn')) return; // Already processed
            
            const link = item.querySelector('.schedule_link');
            const nameElement = item.querySelector('.schedule_name');
            const timeElement = item.querySelector('.schedule_time');
            const imageElement = item.querySelector('.schedule_img img');
            
            if (!link || !nameElement || !timeElement) return;
            
            const eventName = nameElement.textContent.trim();
            const eventTime = timeElement.textContent.trim();
            const eventLink = link.href;
            const imageUrl = imageElement ? imageElement.src : '';
            
            // Find the stage for this item
            const stageBlock = item.closest('.schedule_block');
            const stageTitle = stageBlock ? stageBlock.querySelector('.schedule_block_title')?.textContent.trim() : '';
            
            const eventData = {
                name: eventName,
                time: eventTime,
                link: eventLink,
                imageUrl: imageUrl,
                stage: stageTitle,
                id: this.generateEventId(eventName, eventTime, stageTitle)
            };
            
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
        return `${name}_${time}_${stage}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    toggleFavorite(eventData, button) {
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
            const selectAllBtn = stageContainer.querySelector('#select-all-stages');
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const allValues = this.stages;
                    this.stageDropdown.setValue(allValues);
                });
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
        const scheduleItems = document.querySelectorAll('.schedule_item');
        
        scheduleItems.forEach(item => {
            const nameElement = item.querySelector('.schedule_name');
            const timeElement = item.querySelector('.schedule_time');
            const stageBlock = item.closest('.schedule_block');
            const stageTitle = stageBlock ? stageBlock.querySelector('.schedule_block_title')?.textContent.trim() : '';
            
            if (!nameElement || !timeElement) return;
            
            const eventName = nameElement.textContent.trim();
            const eventTime = timeElement.textContent.trim();
            const eventId = this.generateEventId(eventName, eventTime, stageTitle);
            
            let shouldShow = true;
            
            // Check favorites filter
            if (this.currentFilters.showFavorites) {
                shouldShow = this.favorites.some(fav => fav.id === eventId);
            }
            
            // Check stage filter
            if (shouldShow && this.currentFilters.selectedStages.length > 0) {
                shouldShow = this.currentFilters.selectedStages.includes(stageTitle);
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
        
        // Recompute conflicts when filters change
        this.recomputeConflicts();
    }

    buildSchedule() {
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

        if (this.favorites.length === 0) {
            alert(i18n.getMessage('noFavoritesSelected'));
            return;
        }

        // Clear previous conflict highlighting
        this.clearConflictHighlighting();

        // Get all currently visible events on the page
        const visibleEvents = this.getVisibleEventsOnPage();
        
        // Filter favorites to only include artists that are currently on the page
        const filteredFavorites = this.favorites.filter(favorite => {
            return visibleEvents.some(event => event.id === favorite.id);
        });

        if (filteredFavorites.length === 0) {
            alert(i18n.getMessage('noFavoritesOnPage'));
            return;
        }

        // Parse times and create schedule
        const scheduleData = this.parseScheduleData(filteredFavorites);
        const conflicts = this.detectConflicts(scheduleData);
        
        // Highlight conflicts in main list
        this.highlightConflicts(conflicts);
        
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
            const nameElement = item.querySelector('.schedule_name');
            const timeElement = item.querySelector('.schedule_time');
            const stageBlock = item.closest('.schedule_block');
            const stageTitle = stageBlock ? stageBlock.querySelector('.schedule_block_title')?.textContent.trim() : '';
            
            if (!nameElement || !timeElement) return;
            
            const eventName = nameElement.textContent.trim();
            const eventTime = timeElement.textContent.trim();
            const eventId = this.generateEventId(eventName, eventTime, stageTitle);
            
            visibleEvents.push({
                id: eventId,
                name: eventName,
                time: eventTime,
                stage: stageTitle
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

    highlightConflicts(conflicts) {
        // Clear previous highlighting
        this.clearConflictHighlighting();
        
        if (conflicts.length === 0) return;

        // Group conflicts by connected events
        const conflictGroups = this.groupConflicts(conflicts);
        
        // Assign different colors to each conflict group
        const conflictColors = [
            'conflict-highlight-red',
            'conflict-highlight-blue', 
            'conflict-highlight-green',
            'conflict-highlight-orange',
            'conflict-highlight-purple',
            'conflict-highlight-pink'
        ];

        conflictGroups.forEach((group, groupIndex) => {
            const colorClass = conflictColors[groupIndex % conflictColors.length];
            
            group.forEach(eventId => {
                // Find and highlight conflicted events in the main schedule
                const scheduleItems = document.querySelectorAll('.schedule_item');
                scheduleItems.forEach(item => {
                    const nameElement = item.querySelector('.schedule_name');
                    const timeElement = item.querySelector('.schedule_time');
                    const stageBlock = item.closest('.schedule_block');
                    const stageTitle = stageBlock ? stageBlock.querySelector('.schedule_block_title')?.textContent.trim() : '';
                    
                    if (!nameElement || !timeElement) return;
                    
                    const eventName = nameElement.textContent.trim();
                    const eventTime = timeElement.textContent.trim();
                    const currentEventId = this.generateEventId(eventName, eventTime, stageTitle);
                    
                    if (currentEventId === eventId) {
                        timeElement.classList.add('conflict-highlight', colorClass);
                    }
                });
            });
        });
    }

    groupConflicts(conflicts) {
        const groups = [];
        const processedEvents = new Set();

        conflicts.forEach(conflict => {
            const event1Id = conflict.event1.id;
            const event2Id = conflict.event2.id;
            
            // Find if either event is already in a group
            let existingGroup = null;
            for (let group of groups) {
                if (group.has(event1Id) || group.has(event2Id)) {
                    existingGroup = group;
                    break;
                }
            }
            
            if (existingGroup) {
                // Add both events to existing group
                existingGroup.add(event1Id);
                existingGroup.add(event2Id);
            } else {
                // Create new group
                const newGroup = new Set([event1Id, event2Id]);
                groups.push(newGroup);
            }
        });

        return groups;
    }

    clearConflictHighlighting() {
        const conflictedTimes = document.querySelectorAll('.conflict-highlight');
        conflictedTimes.forEach(element => {
            element.classList.remove('conflict-highlight', 'conflict-highlight-red', 'conflict-highlight-blue', 'conflict-highlight-green', 'conflict-highlight-orange', 'conflict-highlight-purple', 'conflict-highlight-pink');
        });
    }

    generateScheduleTable(scheduleData, conflicts) {
        const tableContainer = document.getElementById('schedule-table-container');
        const tableBody = document.getElementById('schedule-table-body');
        
        if (!tableContainer || !tableBody) return;

        // Clear existing table
        tableBody.innerHTML = '';

        // Group events by conflicts
        const groupedEvents = this.groupEventsByConflicts(scheduleData, conflicts);

        // Generate table rows
        groupedEvents.forEach(group => {
            if (group.events.length === 1) {
                // Single event, no conflict
                const event = group.events[0];
                const row = this.createTableRow(event, false);
                tableBody.appendChild(row);
            } else {
                // Multiple events, conflict
                group.events.forEach((event, index) => {
                    const row = this.createTableRow(event, true, index === 0 ? group.events.length : 0);
                    tableBody.appendChild(row);
                });
            }
        });

        // Show table
        tableContainer.style.display = 'block';
        this.isScheduleShown = true;
    }

    groupEventsByConflicts(scheduleData, conflicts) {
        const groups = [];
        const processedEvents = new Set();

        // Create groups for conflicted events
        conflicts.forEach(conflict => {
            const group = {
                events: [],
                hasConflict: true
            };

            if (!processedEvents.has(conflict.event1.id)) {
                group.events.push(conflict.event1);
                processedEvents.add(conflict.event1.id);
            }

            if (!processedEvents.has(conflict.event2.id)) {
                group.events.push(conflict.event2);
                processedEvents.add(conflict.event2.id);
            }

            if (group.events.length > 0) {
                groups.push(group);
            }
        });

        // Add non-conflicted events
        scheduleData.forEach(event => {
            if (!processedEvents.has(event.id)) {
                groups.push({
                    events: [event],
                    hasConflict: false
                });
                processedEvents.add(event.id);
            }
        });

        // Sort groups by time
        return groups.sort((a, b) => a.events[0].minutes - b.events[0].minutes);
    }

    createTableRow(event, isConflict, conflictCount = 0) {
        const row = document.createElement('tr');
        row.className = isConflict ? 'conflict-row' : '';

        const timeCell = document.createElement('td');
        timeCell.textContent = event.time;
        timeCell.className = isConflict ? 'conflict-time' : '';

        const artistCell = document.createElement('td');
        artistCell.textContent = event.name;
        artistCell.className = isConflict ? 'conflict-artist' : '';

        const stageCell = document.createElement('td');
        stageCell.textContent = event.stage;
        stageCell.className = isConflict ? 'conflict-stage' : '';

        row.appendChild(timeCell);
        row.appendChild(artistCell);
        row.appendChild(stageCell);

        return row;
    }

    recomputeConflicts() {
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

        // Get all currently visible events on the page
        const visibleEvents = this.getVisibleEventsOnPage();
        
        // Filter favorites to only include artists that are currently on the page
        const filteredFavorites = this.favorites.filter(favorite => {
            return visibleEvents.some(event => event.id === favorite.id);
        });

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

        // Parse times and create schedule
        const scheduleData = this.parseScheduleData(filteredFavorites);
        const conflicts = this.detectConflicts(scheduleData);
        
        // Highlight conflicts in main list with different colors
        this.highlightConflicts(conflicts);
        
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
        });
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
}

new AtlasScheduleHelper();
