import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_DIR = path.join(__dirname, '../../data/vector_store');
const STRATEGIES_FILE = path.join(STORE_DIR, 'strategies.json');

// Ensure data directory exists
if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

/**
 * Simple in-memory vector store for trading strategies
 * In production, consider using a proper vector database like Pinecone, Weaviate, or Chroma
 */

class VectorStore {
  constructor() {
    this.strategies = [];
    this.loadStrategies();
  }

  /**
   * Generate a simple embedding/vector representation of text
   * In production, use a proper embedding model (OpenAI, Cohere, etc.)
   */
  generateEmbedding(text) {
    // Simple keyword-based embedding (for demo purposes)
    // In production, replace with actual embedding API
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    const embedding = new Array(128).fill(0);
    words.forEach((word, idx) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += 1;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Add a strategy to the vector store
   */
  addStrategy(strategy, metadata = {}) {
    const embedding = this.generateEmbedding(strategy);
    const strategyEntry = {
      id: Date.now().toString(),
      strategy,
      embedding,
      metadata,
      timestamp: new Date().toISOString(),
    };
    
    this.strategies.push(strategyEntry);
    this.saveStrategies();
    
    logger.info('Strategy added to vector store', { strategyId: strategyEntry.id });
    return strategyEntry.id;
  }

  /**
   * Search for similar strategies
   */
  searchSimilar(query, topK = 5) {
    const queryEmbedding = this.generateEmbedding(query);
    
    const results = this.strategies.map(entry => ({
      ...entry,
      similarity: this.cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter(entry => entry.similarity > 0.1) // Filter out very low similarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
    
    logger.debug('Vector store search completed', { 
      queryLength: query.length,
      resultsCount: results.length 
    });
    
    return results;
  }

  /**
   * Get all strategies
   */
  getAllStrategies() {
    return this.strategies.map(({ strategy, metadata, timestamp }) => ({
      strategy,
      metadata,
      timestamp,
    }));
  }

  /**
   * Save strategies to disk
   */
  saveStrategies() {
    try {
      const data = JSON.stringify(this.strategies, null, 2);
      fs.writeFileSync(STRATEGIES_FILE, data);
    } catch (error) {
      logger.error('Failed to save strategies to vector store', { error: error.message });
    }
  }

  /**
   * Load strategies from disk
   */
  loadStrategies() {
    try {
      if (fs.existsSync(STRATEGIES_FILE)) {
        const data = fs.readFileSync(STRATEGIES_FILE, 'utf8');
        this.strategies = JSON.parse(data);
        logger.info('Loaded strategies from vector store', { count: this.strategies.length });
      }
    } catch (error) {
      logger.warn('Failed to load strategies from vector store', { error: error.message });
      this.strategies = [];
    }
  }

  /**
   * Clear all strategies
   */
  clear() {
    this.strategies = [];
    this.saveStrategies();
    logger.info('Vector store cleared');
  }
}

// Singleton instance
const vectorStore = new VectorStore();

export default vectorStore;

