# DDO Quest Tracker - Patch Notes

## Version 2.3.0 - October 2025

### New Features

**Saga Progress Tracking**:
- Added a separate section for keeping track of sagas, as well as a button to quickly filter to show only those saga quests

**Wiki links added to Patrons**

### Storage & Data Management

**Local Storage**:
- The site will now save your progress in your browser's localstorage, so you no longer need to keep the Hash.
- Export/Import function still available for sharing progress between devices/with friends

**Data Updates**:
- Keepers of the Feather have been updated to Keepers of Barovia everywhere

### UI/UX Improvements
- Patron Favor Progress now collapsed by default

### License
- Updated readme to accurately reflect the GPLv3 license

---

## Version 2.2.0 - September 2025
### Major Update: Tri-State Toggles
- **Tri-State Filtering**: All major filters (quest tiers, completion status, patrons, raids, adventure packs, expansions) now use tri-state toggles (include/exclude/neutral) for more flexible filtering.
- **Visual Consistency**: Unified toggle appearance across all filter types for a cleaner UI.
- **Default Filters**: Filters now default to showing all content for a more intuitive experience.
- **Text Overflow Fixes**: Adventure pack and expansion names now wrap correctly for improved readability.
- **Expansion List Accuracy**: Expansion filter now matches quest data and displays correct counts.
- **Collapsible Categories**: Both Adventure Packs and Expansions are collapsed by default for a cleaner initial view.

---

## Version 2.1.0 - September 2025

### New Features
- **Epic & Legendary Quest Filters**: Added dedicated filters for Epic (21-29) and Legendary (30+) quest tiers
- **Quest Card Color Coding**: Epic quests now display with purple titles, Legendary quests with orange titles
- **Tier Labels**: Quest cards now show (Epic) or {Legendary} labels next to the title
- **Heroic Quest Filter**: Added Heroic (1-19) quest filter to complete the tier system
- **Raid Detection & Filtering**: Implemented comprehensive raid tagging and filtering system
- **UI Reorganization**: Reorganized filters into logical collapsible sections for better usability

### Improvements
- **Filter Organization**: Moved filters into "Quest Type" collapsible section with better grouping
- **Patron Filters**: Repositioned patron filters between quest type and completion status
- **Performance**: Migrated raid detection from external file to optimized hardcoded system
- **Responsive Design**: Enhanced mobile experience for filter sections

### Technical Changes
- Enhanced quest classification system with helper functions
- Improved URL hash persistence for all new filter types
- Updated TypeScript interfaces for better type safety
- Optimized filtering logic for better performance

---

## Version 2.0.0 - Foundation Release

### Core Features
- **Quest Completion Tracking**: Comprehensive quest completion system with URL hash persistence
- **Adventure Pack Filtering**: Filter quests by expansion content and adventure packs
- **Patron-based Filtering**: Organize quests by patron with collapsible interface
- **Smart Search**: Quest search functionality with autocomplete suggestions
- **Level Range Filtering**: Filter quests by minimum and maximum level requirements
- **Progress Management**: Save and load progress functionality with hash-based sharing

### Data Management
- **Quest Database**: Comprehensive DDO quest database with metadata
- **Favor Tracking**: Integration with patron favor tiers and requirements
- **Completion States**: Multiple completion status tracking (completed, optional, etc.)
- **Data Persistence**: Robust URL-based save system with compression

### User Interface
- **Dark Theme**: Professional dark theme optimized for extended use
- **Responsive Design**: Mobile-friendly interface with collapsible sections
- **Accessibility**: ARIA labels and keyboard navigation support
- **Visual Feedback**: Clear status indicators and success/error messaging

---

*For technical support or feature requests, please check the GitHub repository.*