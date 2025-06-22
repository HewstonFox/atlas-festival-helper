/**
 * Shared Components for Atlas Festival Helper
 * Contains ButtonComponent and GenericDropdown classes
 */

/**
 * Generic Button Component for Atlas Festival Helper
 * Supports different button types: filter, primary, and secondary
 */
class ButtonComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            id: '',
            text: '',
            icon: '',
            type: 'secondary', // 'primary', 'secondary', 'filter'
            onClick: null,
            disabled: false,
            active: false,
            className: '',
            ...options
        };
        
        this.element = null;
        this.init();
    }
    
    init() {
        this.createButton();
        this.addEventListeners();
    }
    
    createButton() {
        this.element = document.createElement('button');
        this.element.id = this.options.id;
        this.element.className = this.getButtonClasses();
        
        // Create icon if provided
        if (this.options.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = this.getIconClasses();
            iconSpan.textContent = this.options.icon;
            this.element.appendChild(iconSpan);
        }
        
        // Add text
        if (this.options.text) {
            const textNode = document.createTextNode(this.options.text);
            this.element.appendChild(textNode);
        }
        
        // Set disabled state
        if (this.options.disabled) {
            this.element.disabled = true;
        }
        
        // Set active state
        if (this.options.active) {
            this.element.classList.add('active');
        }
        
        // Append to container
        this.container.appendChild(this.element);
    }
    
    getButtonClasses() {
        const baseClasses = ['atlas-btn'];
        
        // Add type-specific classes
        switch (this.options.type) {
            case 'primary':
                baseClasses.push('atlas-btn--primary');
                break;
            case 'build-schedule':
                baseClasses.push('atlas-btn--build-schedule');
                break;
            case 'filter':
                baseClasses.push('atlas-btn--filter');
                break;
            case 'secondary':
            default:
                baseClasses.push('atlas-btn--secondary');
                break;
        }
        
        // Add custom classes
        if (this.options.className) {
            baseClasses.push(this.options.className);
        }
        
        return baseClasses.join(' ');
    }
    
    getIconClasses() {
        const baseClasses = ['atlas-btn__icon'];
        
        // Add type-specific icon classes
        switch (this.options.type) {
            case 'primary':
                baseClasses.push('atlas-btn__icon--primary');
                break;
            case 'build-schedule':
                baseClasses.push('atlas-btn__icon--build-schedule');
                break;
            case 'filter':
                baseClasses.push('atlas-btn__icon--filter');
                break;
            case 'secondary':
            default:
                baseClasses.push('atlas-btn__icon--secondary');
                break;
        }
        
        return baseClasses.join(' ');
    }
    
    addEventListeners() {
        if (this.options.onClick && typeof this.options.onClick === 'function') {
            this.element.addEventListener('click', this.options.onClick);
        }
    }
    
    // Public methods
    setActive(active) {
        if (active) {
            this.element.classList.add('active');
        } else {
            this.element.classList.remove('active');
        }
    }
    
    setDisabled(disabled) {
        this.element.disabled = disabled;
    }
    
    setText(text) {
        // Remove existing text nodes
        const textNodes = Array.from(this.element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        textNodes.forEach(node => node.remove());
        
        // Add new text
        if (text) {
            const textNode = document.createTextNode(text);
            this.element.appendChild(textNode);
        }
    }
    
    setIcon(icon) {
        let iconSpan = this.element.querySelector('.atlas-btn__icon');
        
        if (icon) {
            if (!iconSpan) {
                iconSpan = document.createElement('span');
                iconSpan.className = this.getIconClasses();
                this.element.insertBefore(iconSpan, this.element.firstChild);
            }
            iconSpan.textContent = icon;
        } else if (iconSpan) {
            iconSpan.remove();
        }
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

/**
 * Generic Dropdown Component for Atlas Festival Helper
 * Supports single and multiple selection modes
 */
class GenericDropdown {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            isMultiple: false,
            isAtLeastOneRequired: false,
            options: [],
            beginContent: '',
            onChange: null,
            placeholder: 'Select option...',
            ...options
        };
        
        // Initialize selectedValues based on options that have selected: true
        if (this.options.isMultiple) {
            this.selectedValues = this.options.options
                .filter(option => option.selected)
                .map(option => option.value);
        } else {
            const selectedOption = this.options.options.find(option => option.selected);
            this.selectedValues = selectedOption ? selectedOption.value : null;
        }
        
        this.isOpen = false;
        this.element = null;
        
        this.init();
    }

    init() {
        this.createDropdown();
        this.addEventListeners();
        this.updateDisplayText();
        this.updateOptionStates();
    }

    createDropdown() {
        this.element = document.createElement('div');
        this.element.className = 'generic-dropdown';
        
        const header = document.createElement('div');
        header.className = 'generic-dropdown-header';
        header.innerHTML = `
            <span class="generic-dropdown-text">${this.options.placeholder}</span>
            <span class="generic-dropdown-arrow">▼</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'generic-dropdown-content';
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'generic-dropdown-options';
        
        // Add begin content if provided
        if (this.options.beginContent) {
            const beginContentDiv = document.createElement('div');
            beginContentDiv.className = 'generic-dropdown-begin-content';
            beginContentDiv.innerHTML = this.options.beginContent;
            content.appendChild(beginContentDiv);
        }
        
        // Add options
        this.options.options.forEach(option => {
            const optionElement = this.createOptionElement(option);
            optionsContainer.appendChild(optionElement);
        });
        
        content.appendChild(optionsContainer);
        this.element.appendChild(header);
        this.element.appendChild(content);
        
        this.container.appendChild(this.element);
    }

    createOptionElement(option) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'generic-dropdown-option';
        optionDiv.dataset.value = option.value;
        
        if (this.options.isMultiple) {
            optionDiv.innerHTML = `
                <input type="checkbox" value="${option.value}" ${option.selected ? 'checked' : ''}>
                <span class="generic-dropdown-checkbox"></span>
                <span class="generic-dropdown-label">${option.label}</span>
            `;
        } else {
            optionDiv.innerHTML = `
                <span class="generic-dropdown-label">${option.label}</span>
            `;
        }
        
        return optionDiv;
    }

    addEventListeners() {
        const header = this.element.querySelector('.generic-dropdown-header');
        const content = this.element.querySelector('.generic-dropdown-content');
        
        // Toggle dropdown
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });
        
        // Handle option selection
        const options = this.element.querySelectorAll('.generic-dropdown-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleOptionClick(option);
            });
        });
        
        // Handle checkbox changes for multiple selection
        if (this.options.isMultiple) {
            const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    this.handleCheckboxChange(checkbox);
                });
            });
        }
    }

    handleOptionClick(optionElement) {
        const value = optionElement.dataset.value;
        
        if (this.options.isMultiple) {
            const checkbox = optionElement.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            this.handleCheckboxChange(checkbox);
        } else {
            this.selectValue(value);
        }
    }

    handleCheckboxChange(checkbox) {
        const value = checkbox.value;
        const isChecked = checkbox.checked;
        
        if (isChecked) {
            if (!this.selectedValues.includes(value)) {
                this.selectedValues.push(value);
            }
        } else {
            // Check if we can uncheck (at least one required)
            if (this.options.isAtLeastOneRequired && this.selectedValues.length === 1) {
                checkbox.checked = true; // Prevent unchecking
                return;
            }
            this.selectedValues = this.selectedValues.filter(v => v !== value);
        }
        
        this.updateDisplayText();
        this.updateCheckboxStates();
        this.updateOptionStates();
        this.triggerChange();
    }

    selectValue(value) {
        this.selectedValues = value;
        this.updateDisplayText();
        this.updateOptionStates();
        this.close();
        this.triggerChange();
    }

    updateDisplayText() {
        const textElement = this.element.querySelector('.generic-dropdown-text');
        
        if (this.options.isMultiple) {
            if (this.selectedValues.length === 0) {
                textElement.textContent = this.options.placeholder;
            } else if (this.selectedValues.length === 1) {
                const option = this.options.options.find(opt => opt.value === this.selectedValues[0]);
                textElement.textContent = option ? option.label : this.selectedValues[0];
            } else if (this.selectedValues.length === this.options.options.length) {
                // All options are selected, show "All Stages" for stage dropdown
                textElement.textContent = this.options.placeholder === i18n.getMessage('allStages') ? i18n.getMessage('allStages') : `${this.selectedValues.length} selected`;
            } else {
                textElement.textContent = `${this.selectedValues.length} selected`;
            }
        } else {
            if (this.selectedValues) {
                const option = this.options.options.find(opt => opt.value === this.selectedValues);
                textElement.textContent = option ? option.label : this.selectedValues;
            } else {
                textElement.textContent = this.options.placeholder;
            }
        }
    }

    updateCheckboxStates() {
        const checkboxes = this.element.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const isSelected = this.selectedValues.includes(checkbox.value);
            checkbox.checked = isSelected;
        });
    }

    updateOptionStates() {
        const options = this.element.querySelectorAll('.generic-dropdown-option');
        options.forEach(option => {
            const value = option.dataset.value;
            const isSelected = this.options.isMultiple 
                ? this.selectedValues.includes(value)
                : this.selectedValues === value;
            
            // Only highlight options in single-select mode
            if (!this.options.isMultiple) {
                if (isSelected) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            } else {
                // Remove any existing selected class in multi-select mode
                option.classList.remove('selected');
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.element.classList.add('open');
        this.isOpen = true;
    }

    close() {
        this.element.classList.remove('open');
        this.isOpen = false;
    }

    triggerChange() {
        if (this.options.onChange) {
            this.options.onChange(this.selectedValues);
        }
    }

    getValue() {
        return this.selectedValues;
    }

    setValue(value) {
        if (this.options.isMultiple) {
            this.selectedValues = Array.isArray(value) ? value : [value];
        } else {
            this.selectedValues = value;
        }
        this.updateDisplayText();
        this.updateCheckboxStates();
        this.updateOptionStates();
        // Trigger change event when value is set programmatically
        this.triggerChange();
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ButtonComponent, GenericDropdown };
} 