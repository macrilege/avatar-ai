// Simple RAG Service for Michael's Knowledge Base
// This provides semantic search over Michael's professional information

import { createKnowledgeChunks, MICHAEL_KNOWLEDGE_BASE } from './knowledge-extractor.js';

class MichaelRAGService {
  constructor() {
    this.knowledgeChunks = createKnowledgeChunks();
    this.initializeIndex();
  }

  initializeIndex() {
    // Simple keyword-based indexing for now
    // In a production system, you'd use proper embeddings
    this.searchIndex = new Map();
    
    this.knowledgeChunks.forEach(chunk => {
      const words = this.extractKeywords(chunk.content.toLowerCase());
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, []);
        }
        this.searchIndex.get(word).push(chunk);
      });
    });
  }

  extractKeywords(text) {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had']);
    
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.toLowerCase());
  }

  // Simple semantic search implementation
  search(query, limit = 5) {
    const queryWords = this.extractKeywords(query.toLowerCase());
    const chunkScores = new Map();

    // Score chunks based on keyword matches
    queryWords.forEach(word => {
      if (this.searchIndex.has(word)) {
        this.searchIndex.get(word).forEach(chunk => {
          const currentScore = chunkScores.get(chunk.id) || 0;
          chunkScores.set(chunk.id, currentScore + 1);
        });
      }
    });

    // Get top scoring chunks
    const results = Array.from(chunkScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([chunkId, score]) => {
        const chunk = this.knowledgeChunks.find(c => c.id === chunkId);
        return { ...chunk, relevanceScore: score };
      });

    return results;
  }

  // Enhanced query processing for specific question types
  processQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    // Detect question intent
    if (lowerQuery.includes('skill') || lowerQuery.includes('technology') || lowerQuery.includes('programming')) {
      return this.getSkillsResponse(query);
    }
    
    if (lowerQuery.includes('project') || lowerQuery.includes('work') || lowerQuery.includes('built')) {
      return this.getProjectsResponse(query);
    }
    
    if (lowerQuery.includes('certification') || lowerQuery.includes('education') || lowerQuery.includes('course')) {
      return this.getCertificationsResponse(query);
    }
    
    if (lowerQuery.includes('experience') || lowerQuery.includes('background') || lowerQuery.includes('about')) {
      return this.getExperienceResponse(query);
    }

    if (lowerQuery.includes('contact') || lowerQuery.includes('reach') || lowerQuery.includes('linkedin')) {
      return this.getContactResponse(query);
    }

    // Default search
    return this.search(query);
  }

  getSkillsResponse(query) {
    const skillChunks = this.knowledgeChunks.filter(chunk => chunk.category === 'skills');
    
    if (query.toLowerCase().includes('ai') || query.toLowerCase().includes('machine learning')) {
      return skillChunks.filter(chunk => chunk.subcategory === 'aiMachineLearning');
    }
    
    if (query.toLowerCase().includes('frontend') || query.toLowerCase().includes('react')) {
      return skillChunks.filter(chunk => chunk.subcategory === 'frontend');
    }
    
    if (query.toLowerCase().includes('backend') || query.toLowerCase().includes('api')) {
      return skillChunks.filter(chunk => chunk.subcategory === 'backendInfrastructure');
    }
    
    return skillChunks;
  }

  getProjectsResponse(query) {
    const projectChunks = this.knowledgeChunks.filter(chunk => chunk.category === 'projects');
    
    if (query.toLowerCase().includes('rag') || query.toLowerCase().includes('retrieval')) {
      return projectChunks.filter(chunk => chunk.metadata.title.toLowerCase().includes('rag'));
    }
    
    if (query.toLowerCase().includes('chatbot') || query.toLowerCase().includes('chat')) {
      return projectChunks.filter(chunk => chunk.metadata.title.toLowerCase().includes('chatbot'));
    }
    
    return projectChunks;
  }

  getCertificationsResponse(query) {
    return this.knowledgeChunks.filter(chunk => chunk.category === 'certifications');
  }

  getExperienceResponse(query) {
    return this.knowledgeChunks.filter(chunk => 
      chunk.category === 'experience' || chunk.category === 'personal'
    );
  }

  getContactResponse(query) {
    const personalInfo = MICHAEL_KNOWLEDGE_BASE.personal;
    return [{
      id: 'contact',
      content: `You can reach Michael McCullough through LinkedIn: ${personalInfo.links.linkedin}, GitHub: ${personalInfo.links.github}, or CodePen: ${personalInfo.links.codepen}`,
      category: 'contact',
      metadata: personalInfo.links
    }];
  }

  // Generate contextual response for the avatar
  generateContextualResponse(query, searchResults) {
    if (!searchResults || searchResults.length === 0) {
      return "I don't have specific information about that. You can ask me about Michael's skills, projects, certifications, or experience!";
    }

    const topResult = searchResults[0];
    const context = searchResults.slice(0, 3).map(r => r.content).join(' ');
    
    // Create a natural response based on the category
    switch (topResult.category) {
      case 'skills':
        return `Michael has extensive expertise in ${topResult.subcategory.replace(/([A-Z])/g, ' $1').toLowerCase()}. ${context}`;
      
      case 'projects':
        return `One of Michael's notable projects is ${topResult.metadata.title}. ${topResult.content}`;
      
      case 'certifications':
        return `Regarding certifications, ${context}`;
      
      case 'experience':
        return `About Michael's background: ${context}`;
      
      case 'contact':
        return `${context}`;
      
      default:
        return `Here's what I know: ${context}`;
    }
  }
}

// Export singleton instance
const ragService = new MichaelRAGService();
export default ragService;
