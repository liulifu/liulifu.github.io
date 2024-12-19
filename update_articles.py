import os
import json
from datetime import datetime

def process_markdown_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract title from filename
    filename = os.path.basename(file_path)
    title = filename[11:-3].replace('-', ' ').upper()
    
    # Create new content
    new_content = f'''# {title}

A technical exploration and guide

## Content

{content}'''
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

def main():
    posts_dir = 'posts'
    
    # Process all markdown files except about.md
    for filename in os.listdir(posts_dir):
        if filename.endswith('.md') and filename != 'about.md' and not filename.startswith('about'):
            file_path = os.path.join(posts_dir, filename)
            try:
                process_markdown_file(file_path)
                print(f"Processed: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")

if __name__ == "__main__":
    main()
