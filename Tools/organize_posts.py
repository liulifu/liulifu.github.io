import os
import re
from datetime import datetime
import frontmatter
import yaml

def sanitize_filename(filename):
    """Convert Chinese filename to pinyin or keep English filename."""
    # You may want to add pypinyin package for Chinese to pinyin conversion
    # For now, we'll just remove special characters
    return re.sub(r'[^\w\-\.]', '-', filename)

def get_post_date(content):
    """Try to extract date from post content or use file modification time."""
    date_pattern = r'\d{4}-\d{2}-\d{2}'
    match = re.search(date_pattern, content)
    if match:
        return match.group(0)
    return datetime.now().strftime('%Y-%m-%d')

def get_categories_from_path(filepath):
    """Determine categories based on file path or content."""
    if 'cloud' in filepath.lower():
        return ['Cloud']
    elif 'python' in filepath.lower():
        return ['Programming', 'Python']
    elif 'cpp' in filepath.lower() or 'c++' in filepath.lower():
        return ['Programming', 'C++']
    return ['Uncategorized']

def process_post(filepath):
    """Process a single post file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file already has front matter
    if content.startswith('---'):
        return None

    # Extract title from first heading
    title_match = re.search(r'^#\s*(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else os.path.splitext(os.path.basename(filepath))[0]

    # Create front matter
    front_matter = {
        'layout': 'post',
        'title': title,
        'date': get_post_date(content),
        'categories': get_categories_from_path(filepath),
        'tags': [],  # You may want to add logic to extract tags
        'description': ''  # You may want to add logic to generate description
    }

    # Combine front matter with content
    new_content = f"""---
{yaml.dump(front_matter, allow_unicode=True)}---

{content}"""

    return new_content

def organize_posts(posts_dir):
    """Organize all posts in the directory."""
    for filename in os.listdir(posts_dir):
        if not filename.endswith('.md'):
            continue

        filepath = os.path.join(posts_dir, filename)
        new_content = process_post(filepath)
        
        if new_content:
            # Backup original file
            backup_path = filepath + '.bak'
            os.rename(filepath, backup_path)
            
            # Write new content
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"Processed: {filename}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    posts_dir = os.path.join(os.path.dirname(script_dir), "content", "posts")
    organize_posts(posts_dir)
