# Personal Blog

A static personal blog built with HTML, CSS, and JavaScript, designed to be hosted on GitHub Pages.

## Features

- Clean, minimalist design inspired by the Monospace theme
- Markdown support for blog posts using showdown.js
- Responsive design that works on all devices
- Dark mode support
- Image and video support in blog posts
- Simple navigation between posts and pages

## Directory Structure

```
.
├── index.html          # Main entry point
├── index.css          # Main styles
├── reset.css         # CSS reset
├── index.js         # Blog functionality
├── showdown.min.js # Markdown converter
└── posts/         # Blog posts directory
    ├── index.json   # Posts index
    └── *.md        # Markdown posts
```

## Adding New Posts

1. Create a new Markdown file in the `posts` directory using the format: `YYYY-MM-DD-title.md`
2. Add the post metadata to `posts/index.json`
3. Write your post content in Markdown format

### Post Metadata Format

Add your post to `posts/index.json` in the following format:

```json
{
    "posts": [
        {
            "title": "Your Post Title",
            "date": "YYYY-MM-DD",
            "file": "YYYY-MM-DD-title.md",
            "excerpt": "Brief description of your post"
        }
    ]
}
```

### Markdown Features

- Standard Markdown syntax
- Image support: `![alt text](image.jpg)`
- Video support: `<video src="video.mp4"></video>`
- Code blocks with syntax highlighting
- Tables
- Task lists
- Strikethrough

## Development

To run locally, you'll need a local web server. You can use Python's built-in server:

```bash
python -m http.server
```

Then visit `http://localhost:8000` in your browser.

## Deployment

1. Create a new repository on GitHub
2. Push your code to the repository
3. Enable GitHub Pages in your repository settings
4. Your blog will be available at `https://yourusername.github.io/repositoryname`

## License

MIT License
