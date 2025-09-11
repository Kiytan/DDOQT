# DDO Quest Tracker

A minimal Svelte 5 web application for tracking completed Dungeons & Dragons Online (DDO) quests. Features quest filtering, progress statistics, and persistent progress saving via URL hash.

## Features

- **Quest Management**: Track completion status of DDO quests
- **Multiple Filters**: Filter by level range, patron, adventure pack, and completion status
- **Progress Statistics**: View completion percentage and earned favor
- **URL Hash Persistence**: Quest progress is automatically saved in the URL hash for easy sharing and bookmarking
- **Responsive Design**: Works on desktop and mobile devices
- **TypeScript Support**: Fully typed for better development experience

## Quest Data Structure

Each quest includes:
- **Name**: Quest title
- **Level**: Recommended character level
- **Difficulty**: Normal, Hard, Elite, or Reaper
- **Favor**: Favor points earned upon completion
- **Patron**: The patron organization (House Deneith, Silver Flame, etc.)
- **Adventure Pack**: Source pack or "Free to Play"
- **Wiki Link**: A link to the doowiki page for that quest

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `build` directory.

## Usage

1. **View Quests**: All available quests are displayed with their details
2. **Mark Complete**: Click the difficulty in the quest card to mark it as completed
3. **Filter Quests**: Use the filter panel to narrow down quests by:
   - Level range (min/max)
   - Completion status (all, completed, not completed)
   - Patron organizations
   - Adventure packs
4. **Track Progress**: View your completion statistics at the top
5. **Share Progress**: Your completion status is automatically saved in the URL or using the hash in the settings panel

## Customization

### Adding New Quests

Edit the `static/quests.json` file to add new quests. Each quest should follow this structure:

```json
{
    "id": "unique_id",
    "name": "The Grotto",
    "level": 1,
    "baseFavor": 5,
    "patron": "The Free Agents",
    "adventurePack": "Free to Play"
  }
```

### Styling

The application uses component-scoped CSS. Key style files:
- `src/routes/+page.svelte` - Main layout and global styles
- `src/lib/QuestList.svelte` - Quest card styling
- `src/lib/QuestFilters.svelte` - Filter panel styling
- `src/lib/QuestStats.svelte` - Statistics display styling

## Technical Details

- **Framework**: Svelte 5 with SvelteKit
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Component-scoped CSS
- **State Management**: Svelte stores
- **Data Persistence**: Base64-encoded JSON in URL hash

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run check

# Build for production  
npm run build

# Preview production build
npm run preview
```


## License

This project is open source and available under the [GNU General Public License v3.0](LICENSE).
