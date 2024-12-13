// Function to load tags and posts from metadata.json
async function loadTagsAndPosts() {
    try {
        const response = await fetch('metadata.json');
        const metadata = await response.json();
        
        // Extract all unique tags
        const allTags = new Set();
        metadata.forEach(post => {
            if (post.tags) {
                post.tags.forEach(tag => allTags.add(tag));
            }
        });

        // Display tags
        displayTags(Array.from(allTags));
        
        // Display all posts initially
        displayPosts(metadata);

        // Add click event listeners to tags
        document.querySelectorAll('.tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedTag = e.target.getAttribute('data-tag');
                filterPostsByTag(metadata, selectedTag);
                updateActiveTag(selectedTag);
            });
        });
    } catch (error) {
        console.error('Error loading metadata:', error);
    }
}

// Function to display tags in the sidebar
function displayTags(tags) {
    const tagList = document.getElementById('tagList');
    tagList.innerHTML = tags.map(tag => `
        <a href="#" class="tag" data-tag="${tag}">
            ${tag}
            <span class="tag-count"></span>
        </a>
    `).join('');
}

// Function to display posts
async function displayPosts(posts) {
    const postList = document.getElementById('postList');
    postList.style.opacity = '0';
    
    // Clear existing posts
    postList.innerHTML = '';
    
    // Create and append new posts with animation
    posts.forEach((post, index) => {
        setTimeout(() => {
            const article = document.createElement('article');
            article.className = 'post-card fade-enter';
            article.innerHTML = `
                <div class="post-card-content">
                    <h3 class="post-title">
                        <a href="post.html?post=${post.filename}" class="glow-on-hover">${post.title}</a>
                    </h3>
                    <div class="post-meta">
                        <span class="post-date">${formatDate(post.date)}</span>
                        <div class="post-tags">
                            ${post.tags ? post.tags.map(tag => 
                                `<span class="post-tag glow-on-hover">${tag}</span>`
                            ).join('') : ''}
                        </div>
                    </div>
                    <p class="post-excerpt">${post.excerpt || ''}</p>
                </div>
            `;
            postList.appendChild(article);
            
            // Trigger animation
            requestAnimationFrame(() => {
                article.classList.add('fade-enter-active');
            });
        }, index * 100); // Stagger the animations
    });
    
    // Show the post list
    postList.style.opacity = '1';
}

// Function to filter posts by tag
function filterPostsByTag(posts, selectedTag) {
    const filteredPosts = selectedTag === 'all' 
        ? posts 
        : posts.filter(post => post.tags && post.tags.includes(selectedTag));
    displayPosts(filteredPosts);
}

// Function to update active tag styling
function updateActiveTag(selectedTag) {
    document.querySelectorAll('.tag').forEach(tag => {
        if (tag.getAttribute('data-tag') === selectedTag) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Add loading animation
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.addEventListener('transitionend', () => overlay.remove());
        overlay.style.opacity = '0';
    }
}

// Add smooth scrolling
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show scroll-to-top button when scrolling down
window.addEventListener('scroll', () => {
    const scrollButton = document.getElementById('scrollTopButton');
    if (scrollButton) {
        if (window.scrollY > 300) {
            scrollButton.style.opacity = '1';
        } else {
            scrollButton.style.opacity = '0';
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add scroll to top button
    const scrollButton = document.createElement('button');
    scrollButton.id = 'scrollTopButton';
    scrollButton.className = 'scroll-top-button';
    scrollButton.innerHTML = '↑';
    scrollButton.onclick = scrollToTop;
    document.body.appendChild(scrollButton);
    
    // Load tags and posts with loading animation
    showLoading();
    loadTagsAndPosts().finally(hideLoading);
});
