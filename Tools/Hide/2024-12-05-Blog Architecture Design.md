# BLOG ARCHITECTURE DESIGN

A technical exploration and guide

## Content

# Blog Architecture Design Documentation

This document outlines the architecture design for liulifu.github.io blog hosted on `github.io`, focusing on technical implementation.

## Overview

The blog is a static website built using HTML, CSS, and JavaScript, with a primary focus on Markdown-based content. The blog utilizes dynamic page loading via JavaScript to manage the navigation between different sections, such as articles, tools, and the "About Me" page. Additionally, the blog supports theme switching and responsive design, making it adaptable for various devices and user preferences.

### Key Components

1. **Main Pages**:

   - **`index.html`**: Serves as the primary entry point for the blog, featuring navigation, an embedded iframe for dynamic content loading, and footer information.
   - **`articles.html`**: Displays the list of articles with a search functionality and dynamically loads content based on user input.
   - **`md.html`**: A dedicated page for rendering Markdown files as HTML, using the `showdown.js` library to convert Markdown into HTML format.
2. **Scripts**:

   - **`articles.js`**: Handles fetching and displaying the list of articles from a JSON5 file and implements a search functionality to filter articles by title.
   - **`md.js`**: Manages the style switching functionality for Markdown viewing, allowing users to change between different themes, such as modern, cyberpunk, minimalist, etc.
3. **Style Sheets**:

   - Multiple CSS stylesheets are provided to give users the ability to switch between different visual themes. These include:
     - **Modern**
     - **Cyberpunk**
     - **Minimalist**
     - **Retro**
     - **Neon**
     - **Old Book**

### Architecture Details

1. **Dynamic Content Loading**

   - The website uses an iframe to load different sections without requiring a full page reload. The navigation links update the iframe's `src` attribute to load pages like `articles.html`, `tools.html`, and `md.html`, maintaining a seamless browsing experience.
   - Example from `index.html`:

   ```html
   <iframe id="contentFrame" src="articles.html" style="width: 100%; height: 100vh; overflow: hidden; border: none;" scrolling="no"></iframe>
   ```
2. **Responsive Design**

   - The blog is designed with responsive features, using viewport meta tags and flexible CSS styles. The `iframe` height is dynamically adjusted based on the content height using JavaScript to ensure that it adapts to various screen sizes.
   - Example function from `index.html`:

   ```javascript
   function adjustIframeHeight() {
       var iframe = document.getElementById('contentFrame');
       var iframeHeight = iframe.contentWindow.document.body.scrollHeight;
       iframe.style.height = iframeHeight + 'px';
   }
   ```
3. **Article Management**

   - Articles are managed dynamically through a JSON5 file, which contains metadata such as the title and date. The `articles.js` script loads this data, generating the article list and attaching event listeners for user interactions (e.g., searching for articles).
   - Example from `articles.js`:

   ```javascript
   fetch('articles.json5')
       .then(response => response.text())
       .then(text => {
           const data = JSON5.parse(text);
           createArticleList(data);
       })
       .catch(error => {
           console.error('Failed to load articles:', error);
       });
   ```
4. **Markdown Rendering**

   - The blog uses `showdown.js` to convert Markdown files into HTML format dynamically. Users can load Markdown files into the `md.html` page by passing the file name as a URL parameter.
   - Example from `md.html`:

   ```javascript
   var file = getQueryVariable('file');
   if (file) {
       fetch(file)
           .then(response => response.text())
           .then(text => {
               var converter = new showdown.Converter();
               document.getElementById('content').innerHTML = converter.makeHtml(text);
           })
           .catch(error => {
               document.getElementById('content').innerHTML = "<p>Error loading file.</p>";
           });
   }
   ```
5. **Theme Switching**

   - The blog offers multiple themes for user customization. The theme selection is stored in the browser’s localStorage to persist the user's choice across sessions. The `md.js` script handles the theme switching logic by enabling and disabling specific stylesheets based on the user’s selection.
   - Example from `md.js`:

   ```javascript
   document.getElementById('style-select').addEventListener('change', function() {
       changeStyle(this.value);
   });
   ```
6. **Cross-Document Communication**

   - The blog employs cross-document messaging to synchronize scrolling behavior between the main page and the iframe content. For instance, the position of the style switcher component in the `md.html` page is adjusted based on the scroll position of the parent document (`index.html`).
   - Example from `md.html`:

   ```javascript
   window.addEventListener('message', function(event) {
       if (event.data.scrollTop !== undefined) {
           var styleSwitcher = document.getElementById('style-switcher');
           styleSwitcher.style.top = (10 + event.data.scrollTop) + 'px';
       }
   });
   ```

### Future Extensions

1. **Comment System**

   - Adding a lightweight commenting system could encourage user interaction and engagement. This could be done by integrating third-party solutions like Disqus or by building a simple comment section using localStorage or a lightweight backend.
2. **Pagination for Articles**

   - As the number of articles grows, implementing pagination will be necessary to improve performance and user experience when browsing through a large list of posts.
3. **Search Optimization**

   - The current search functionality is basic and limited to filtering articles by title. In the future, it could be extended to search through article content, tags, and categories for more granular control.
4. **Mobile-Friendly Enhancements**

   - Although the blog is designed responsively, additional testing and enhancements could ensure a smoother experience for mobile users, such as improving touch-based navigation and better handling of smaller screens.

### Conclusion

This blog architecture is built for simplicity, modularity, and customization. The use of Markdown files for content, combined with dynamic loading and theme switching, provides a highly flexible and user-friendly experience. The current design also allows for easy scalability and future enhancements without significant changes to the core structure.
