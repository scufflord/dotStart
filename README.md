# Startpage

A modern, feature-rich personal startpage with theming, bookmarks, weather, background gallery, greeting customization, and keyboard shortcuts.

## Quick Start

- Open `index.html` in your browser or serve the folder with a static server:
  ```bash
  python3 -m http.server 8000
  # Then visit http://localhost:8000
  ```
- Customize everything via the **Config** button  
- Bookmarks are auto-saved to `localStorage`

## What is This Project?

I got bored one night and wanted a custom start page for my browser. I got overwhelmed with all of the different options and thought "Man it would be funny to see what AI can do." And here we are now...

## Features

### 🎨 Visual & Theming
- **Pre-built color schemes**: Gruvbox, Dark Ocean, Solarized, Catppuccin (Mocha, Latte, Frappé)
- **Custom theme editor**: Design your own color scheme with the color picker
- **Auto-theming from backgrounds**: Automatically extract dominant colors from your chosen background and apply them as the theme
- **Welcome typing animation**: Elegant 1.3s typing animation on page load with blinking cursor
- **Page fade-in**: Rest of page fades in after the welcome animation completes
- **Dynamic text colors**: Text colors automatically adjust based on background luminance for contrast

### 🌐 Bookmarks
- **Quick access**: Click bookmarks or use **Ctrl+1 through Ctrl+9** to open bookmarks 1–9, or **Ctrl+0** for bookmark 10
- **Drag-and-drop reordering**: Organize bookmarks by dragging them in the editor
- **Favicon loading**: Automatic favicon fetching with fallback chain (DuckDuckGo → Google → placeholder)
- **URL normalization**: Automatically add `https://` to URLs missing a protocol
- **Toast notifications**: See confirmation when opening bookmarks via hotkey

### 🖼️ Backgrounds
- **Gallery**: Choose from curated backgrounds or upload your own
- **Upload support**: Save custom images to IndexedDB and persist them across sessions
- **Gallery management**: Delete unwanted backgrounds with undo support via toast
- **URL-based backgrounds**: Set backgrounds by URL or from your upload collection

### 🌤️ Weather
- **Live weather display**: Shows current temperature, conditions, and precipitation probability
- **Location configuration**: 
  - Enter custom latitude/longitude in the Config modal
  - **Use Geolocation button**: Automatically detect your current location
  - Defaults to Springfield, MO if no location is saved
- **Open-Meteo API**: Accurate weather data from a privacy-respecting API

### 👋 Greetings
- **Customizable messages**: Set different greetings for morning, afternoon, and evening
- **Time-based display**: Greetings change automatically based on the current time
- **Emojis**: Each greeting includes a seasonal emoji (🌅 🌞 🌙)
- **Persistent**: Your custom greetings are saved to `localStorage`

### ⏰ Clock & Time
- Real-time 12-hour clock displayed in the top bar
- Updates every second

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| <kbd>Ctrl</kbd> + <kbd>1</kbd>–<kbd>9</kbd> | Open bookmarks 1–9 |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | Open bookmark 10 |
| <kbd>Esc</kbd> | Close Config modal |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Navigate between Config modal fields (focus trap) |

**Note**: Keyboard shortcuts are disabled while typing in search, bookmark editor, or modal input fields.

### 🔎 Search Engine (Configurable)
- **Choose engine**: Pick from Google, DuckDuckGo, Bing, Startpage, Brave, or select **Custom** to provide your own template
- **Template syntax**: Use the placeholder `{q}` where the query should be inserted. Example: `https://duckduckgo.com/?q={q}`
- **Persistence**: The chosen engine and template are saved to `localStorage` and applied on page load
- **Behavior**: The main search box uses the configured template and navigates to the resulting search URL in the same tab
- **Validation**: Custom templates must include `{q}`; the Config UI will warn if missing

### ♿ Accessibility
- **Semantic HTML**: Proper use of headings, sections, and landmarks
- **ARIA labels**: All buttons and interactive elements are labeled
- **Keyboard navigation**: Full keyboard support with focus management
- **Focus trap**: Tab/Shift+Tab navigation stays within the Config modal
- **Color contrast**: All text meets WCAG AA contrast standards
- **Screen reader friendly**: Toast notifications and updates are announced
- **Escape to close**: Modal can be closed with the Esc key

### 🔒 Security & Privacy
- **Safe link opening**: All external links use `rel="noopener noreferrer"` to prevent security vulnerabilities
- **CORS-aware**: Handles cross-origin issues gracefully when loading favicons
- **No tracking**: Uses only privacy-respecting APIs (Open-Meteo for weather)
- **Local storage**: All data is stored locally in `localStorage` and IndexedDB—nothing is sent to external servers (except weather API)

## Project Structure

```
.
├── index.html              # Main HTML (semantic, minimal markup)
├── css/
│   └── styles.css         # Modern, responsive styling with animations
├── js/
│   └── script.js          # All interactive logic (bookmarks, weather, themes, etc.)
├── README.md              # This file
├── CONTRIBUTING.md        # Contribution guidelines
└── LICENSE                # MIT License
```

## Technical Details

### Storage
- **localStorage**: Bookmarks, selected theme, custom theme, background URL, greetings, weather location, auto-theme setting
- **IndexedDB**: Uploaded background images (stored as blobs in `startpage-images` database)

### APIs
- **Open-Meteo**: Weather data (free, privacy-respecting, no API key required)
- **Browser Geolocation**: Optional, user-initiated location detection
- **Favicon services**: DuckDuckGo and Google for favicon fetching (with fallback to placeholder SVG)

### Animations
- **Typing animation**: 1.3 seconds with `steps(7)` keyframes and blinking cursor
- **Page fade-in**: 800ms fade, delayed 1.35s to start after typing completes
- **Smooth transitions**: All theme and state changes animate smoothly

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Requirements**: ES6+, CSS3 animations, IndexedDB, localStorage, Geolocation API (optional)

## Customization

All customization happens in the **Config modal**:

1. Click the **Config** button (top-right)
2. Customize:
   - **Bookmarks**: Add, edit, delete, or reorder bookmarks
   - **Background**: Choose from gallery or upload custom images
   - **Theme**: Select a pre-built scheme or design your own
   - **Greetings**: Set custom morning/afternoon/evening messages
   - **Weather**: Configure location or use geolocation
   - **Auto-theme**: Toggle automatic color extraction from backgrounds

### Import / Export
- **Export settings**: Export your bookmarks and settings to a JSON file from the Config modal.
- **Import via file**: Upload a previously exported JSON file to restore settings locally.
- **What is exported**: Bookmarks, selected theme, custom theme values, background selection, greetings, weather location, and auto-theme flag.

## Contributing

See `CONTRIBUTING.md` for a short guide.

## License

This project is available under the MIT License — see `LICENSE`.
