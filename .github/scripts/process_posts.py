import json
import os
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModel
import numpy as np

# Initialize the model
tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

def get_embedding(text):
    # Tokenize and get model output
    inputs = tokenizer(text, padding=True, truncation=True, return_tensors="pt", max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Mean pooling
    attention_mask = inputs['attention_mask']
    token_embeddings = outputs.last_hidden_state
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    embeddings = torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    
    return embeddings[0].numpy().tolist()

def process_markdown(content):
    # Extract first paragraph for excerpt
    lines = content.split('\n')
    excerpt = ''
    for line in lines:
        if line.strip() and not line.startswith('#'):
            excerpt = line.strip()
            break
    return excerpt

def main():
    # Load metadata
    with open('metadata.json', 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    # Process posts
    posts_dir = Path('posts')
    embeddings_data = {'posts': []}

    for post_file in posts_dir.glob('*.md'):
        if post_file.name not in metadata['posts']:
            continue

        post_data = metadata['posts'][post_file.name]
        
        # Read content
        with open(post_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Process content
        excerpt = process_markdown(content)
        
        # Get embedding
        embedding = get_embedding(content[:10000])  # Limit to first 10000 chars
        
        # Add to embeddings data
        embeddings_data['posts'].append({
            'id': post_file.name,
            'title': post_data['title'],
            'excerpt': excerpt,
            'embedding': embedding
        })

    # Save embeddings
    os.makedirs('data', exist_ok=True)
    with open('data/embeddings.json', 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f)

if __name__ == '__main__':
    main()
