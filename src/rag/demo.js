// RAG System Demo for Michael's Knowledge Base
// This script demonstrates the RAG capabilities

import ragService from './rag-service.js';

// Test queries to demonstrate RAG functionality
const testQueries = [
  "What are Michael's AI skills?",
  "Tell me about Michael's projects",
  "What certifications does Michael have?", 
  "How can I contact Michael?",
  "What is Michael's experience with RAG systems?",
  "Does Michael know React?",
  "What programming languages does Michael use?",
  "Tell me about Michael's background",
  "What is Michael's specialization?",
  "Show me Michael's LLM projects"
];

export const runRAGDemo = () => {
  console.log("🤖 RAG Demo for Michael's Knowledge Base");
  console.log("==========================================");
  
  testQueries.forEach((query, index) => {
    console.log(`\n${index + 1}. Query: "${query}"`);
    
    const results = ragService.processQuery(query);
    const response = ragService.generateContextualResponse(query, results);
    
    console.log(`   Response: ${response}`);
    console.log(`   Sources: ${results.length} knowledge chunks found`);
    
    if (results.length > 0) {
      console.log(`   Top Match: ${results[0].category} (score: ${results[0].relevanceScore || 'N/A'})`);
    }
  });
  
  console.log("\n🎯 RAG Demo Complete!");
  console.log("The system can answer questions about:");
  console.log("- Michael's technical skills and expertise");
  console.log("- His professional projects and achievements"); 
  console.log("- Certifications and education");
  console.log("- Contact information and links");
  console.log("- Experience and background");
};

export const searchMichaelKnowledge = (query) => {
  const results = ragService.processQuery(query);
  return ragService.generateContextualResponse(query, results);
};

export default { runRAGDemo, searchMichaelKnowledge };
