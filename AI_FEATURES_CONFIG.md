# AI Features Configuration Guide

This document describes the AI features implemented in the blog and how to configure them.

## Current Features (No API Required)

### 1. Semantic Search
- Uses pre-computed embeddings generated during build time
- Stored in `data/embeddings.json`
- Provides intelligent search without runtime API calls
- Implemented in `js/ai-features.js`

### 2. Related Posts
- Uses the same embeddings as semantic search
- Suggests similar posts based on content similarity
- Zero runtime cost
- Computed during page load

### 3. Reading Time Estimation
- Client-side calculation
- No API required
- Based on word count and average reading speed

## Future API Integration (Optional)

To enable the AI chat feature in the future, you'll need to:

1. **Choose an AI Provider**
   - OpenAI (GPT-3.5/4)
   - Anthropic (Claude)
   - Local LLM options

2. **Configure API Keys**
   ```env
   # Create .env file in your repository (do not commit this file)
   AI_PROVIDER=openai  # or anthropic, local, etc.
   AI_API_KEY=your_api_key_here
   ```

3. **Select Deployment Platform**
   - Netlify Functions
   - Vercel Edge Functions
   - CloudFlare Workers

4. **Modify Configuration**
   Edit `config.js`:
   ```javascript
   const siteConfig = {
     // ... existing config ...
     aiFeatures: {
       enableChat: false,  // Set to true when API is configured
       provider: 'none',   // Change to 'openai', 'anthropic', etc.
       endpoint: '/api/chat'  // API endpoint
     }
   };
   ```

## Cost Considerations

1. **Current Implementation (Free)**
   - Semantic Search: $0 (client-side)
   - Related Posts: $0 (pre-computed)
   - Reading Time: $0 (client-side)

2. **Future Chat Feature (If Implemented)**
   - OpenAI GPT-3.5: ~$0.002 per message
   - OpenAI GPT-4: ~$0.03 per message
   - Anthropic Claude: Varies by model
   - Self-hosted LLM: Server costs only

## Implementation Details

### Current Architecture
```
├── js/
│   ├── ai-features.js     # Core AI functionality
│   └── showdown.min.js    # Markdown rendering
├── .github/
│   ├── workflows/         # GitHub Actions
│   │   └── ai-blog.yml    # Build process
│   └── scripts/
│       └── process_posts.py # Embedding generation
└── data/
    └── embeddings.json    # Pre-computed embeddings
```

### Adding Chat Feature (Future)
1. Create API endpoint:
   ```
   ├── api/
   │   └── chat/
   │       └── route.js    # Serverless function
   ```

2. Update `ai-features.js`:
   ```javascript
   async function chat(message) {
     if (!siteConfig.aiFeatures.enableChat) {
       return {
         error: 'Chat feature not enabled. Configure API key first.'
       };
     }
     // API call implementation
   }
   ```

## Security Considerations

1. **Current Implementation**
   - No sensitive data
   - All processing client-side
   - Embeddings are public but non-sensitive

2. **Future API Integration**
   - Never expose API keys in client code
   - Use environment variables
   - Implement rate limiting
   - Add user authentication if needed

## Troubleshooting

### Current Features
1. **Search Not Working**
   - Check if `embeddings.json` was generated
   - Verify GitHub Action logs
   - Check browser console for errors

2. **Related Posts Not Showing**
   - Verify post ID in metadata
   - Check embedding vectors exist
   - Look for console errors

## Development Guidelines

1. **Adding New Features**
   - Prefer static pre-computation when possible
   - Consider bandwidth impact of embeddings
   - Test locally before deployment

2. **Modifying Existing Features**
   - Update GitHub Actions if changing build process
   - Test with different post lengths
   - Maintain backward compatibility

## Future Roadmap

1. **Phase 1 (Current)**
   - ✅ Semantic search
   - ✅ Related posts
   - ✅ Reading time

2. **Phase 2 (Future - API Required)**
   - ⏳ AI chat assistant
   - ⏳ Dynamic content summaries
   - ⏳ Code explanation

3. **Phase 3 (Future - Optional)**
   - ⏳ Multi-language support
   - ⏳ Content recommendations
   - ⏳ Personalization
