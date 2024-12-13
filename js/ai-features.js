// AI Features for the blog
const AIFeatures = {
    // Vector store for search (initialized during build)
    vectorStore: null,

    // Initialize AI features
    async init() {
        try {
            // Load pre-computed embeddings
            const response = await fetch(siteConfig.getFullPath('data/embeddings.json'));
            if (response.ok) {
                this.vectorStore = await response.json();
            }
        } catch (error) {
            console.warn('AI features not available:', error);
        }
    },

    // Semantic search implementation
    async searchContent(query) {
        if (!this.vectorStore) return [];
        
        // Simple cosine similarity for demo
        // In production, use a proper vector similarity library
        return this.vectorStore.posts
            .sort((a, b) => this.cosineSimilarity(query, b.embedding) - 
                           this.cosineSimilarity(query, a.embedding))
            .slice(0, 5);
    },

    // Get related posts based on content similarity
    async getRelatedPosts(currentPost) {
        if (!this.vectorStore) return [];
        
        const current = this.vectorStore.posts.find(p => p.id === currentPost);
        if (!current) return [];

        return this.vectorStore.posts
            .filter(p => p.id !== currentPost)
            .sort((a, b) => this.cosineSimilarity(current.embedding, b.embedding) - 
                           this.cosineSimilarity(current.embedding, a.embedding))
            .slice(0, 3);
    },

    // Simple cosine similarity implementation
    cosineSimilarity(vec1, vec2) {
        const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
        const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
        const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
        return dotProduct / (mag1 * mag2);
    }
};
