# Svelte Kanban

A local-first Kanban board built with Svelte, TypeScript, and PWA features. This application allows you to organize your tasks visually in a Kanban-style board with drag-and-drop functionality.

![Kanban Board](https://i.imgur.com/dummy-screenshot-link.png)

## Features

- 🚀 **Local-first**: All data is stored in your browser
- 📱 **PWA support**: Works offline with caching
- 🎨 **Colorful stickies**: Organize tasks with color coding
- 🔄 **Drag and drop**: Move tasks between columns
- 📐 **Responsive design**: Works on desktop and mobile

## Columns

The board has four predefined columns:

- Backlog
- To Do
- In Progress
- Done

## Getting Started

### Development

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/svelte-kanban.git
   cd svelte-kanban
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

To create a production version:

```bash
npm run build
```

You can preview the production build with:

```bash
npm run preview
```

## Deployment

This app is configured to deploy to GitHub Pages using GitHub Actions. The workflow is set up to:

1. Build the application when changes are pushed to the main branch
2. Deploy the built files to GitHub Pages

To set this up for your own repository:

1. Fork or clone this repository
2. In your GitHub repository settings, enable GitHub Pages
3. Set the source to "GitHub Actions"
4. Push changes to the main branch to trigger a deployment

## How to Use

### Adding Tasks

1. Click the "+" button in any column
2. Enter task text
3. Choose a color (or use the default)
4. Click "Add" or press Enter

### Moving Tasks

Drag and drop tasks between columns to update their status.

### Editing Tasks

1. Click the edit (✏️) button on a task
2. Update text and/or color
3. Click "Save" or press Enter

### Deleting Tasks

Click the delete (🗑️) button on a task to remove it.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
