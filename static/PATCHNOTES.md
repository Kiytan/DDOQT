# DDO Quest Tracker - Patch Notes

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