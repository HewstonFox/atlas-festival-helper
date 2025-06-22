# Atlas Festival Helper

Chrome extension for Atlas Festival with schedule management and internationalization support.

Totally Vibe coded by Cursor ❤️

## Development

### Setup
1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

### Project Structure
```
├── manifest.json              # Extension configuration
├── popup/                     # Extension popup interface
├── options/                   # Settings page
├── scripts/                   # Content scripts
│   ├── general/              # General site enhancements
│   └── schedule/             # Schedule page features
├── shared/                   # Shared resources
│   ├── core/                 # Core utilities (browser API, i18n)
│   └── components/           # Reusable UI components
└── _locales/                 # Internationalization files
    ├── uk/                   # Ukrainian (default)
    └── en/                   # English
```

### Key Features
- **Cross-browser compatibility** (Chrome/Firefox)
- **Internationalization** (Ukrainian/English)
- **Reusable components** (buttons, dropdowns)
- **Schedule management** for Atlas Festival

### Development Guidelines
- Use shared components from `shared/components/`
- Include core utilities (`browser-api.js`, `i18n.js`) in all scripts
- Follow BEM methodology for CSS classes
- Test in both popup and content script contexts

### Adding New Features
1. Add content scripts to `scripts/` directory
2. Update `manifest.json` with new script entries
3. Use shared components and utilities
4. Add translations to `_locales/` files

### Building
No build process required - load directly as unpacked extension in Chrome. 