# Michael's AI Avatar with RAG System

A 3D AI Avatar powered by Ollama and enhanced with a Retrieval-Augmented Generation (RAG) system containing Michael McCullough's professional knowledge.

## 🤖 What's New: RAG Integration

This avatar now includes a comprehensive knowledge base about Michael McCullough and can answer questions about:

- **Technical Skills**: AI/ML expertise, programming languages, frameworks
- **Projects**: RAG systems, LLM fine-tuning, AI applications  
- **Certifications**: Professional certifications from Meta, Google, Microsoft
- **Experience**: Background in AI engineering and software development
- **Contact**: Professional links and contact information

## 🧠 RAG System Architecture

### Knowledge Base (`src/rag/knowledge-extractor.js`)
- Structured data about Michael's professional background
- Categorized information: skills, projects, certifications, experience
- Easily expandable and maintainable

### RAG Service (`src/rag/rag-service.js`)
- Semantic search over knowledge chunks
- Intent detection for different question types
- Contextual response generation
- Keyword-based indexing (can be upgraded to embeddings)

### Integration (`src/App.js`)
- Enhanced Ollama prompts with RAG context
- Intelligent query processing
- Natural conversation flow

## 💬 Example Conversations

Try asking the avatar:

- "What are Michael's AI skills?"
- "Tell me about Michael's projects" 
- "What certifications does Michael have?"
- "How can I contact Michael?"
- "What is Michael's experience with RAG systems?"
- "Does Michael know React?"
- "What programming languages does Michael use?"

## 🚀 Features

### Core Capabilities
- **3D Avatar**: Realistic talking avatar with lip-sync
- **Voice Input**: Speech recognition for natural interaction
- **Voice Output**: Natural text-to-speech responses
- **RAG-Enhanced AI**: Contextual responses about Michael's background

### Technical Stack
- **Frontend**: React + Three.js for 3D rendering
- **AI Backend**: Local Ollama for LLM inference  
- **RAG System**: Custom knowledge base with semantic search
- **Voice**: Browser Speech Recognition & Synthesis APIs

## 🛠️ Setup & Usage

### Prerequisites
1. **Ollama installed and running**:
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull the model
   ollama pull llama3.2
   
   # Start the service
   ollama serve
   ```

2. **Node.js** (v16+)

### Installation
```bash
# Clone and install
git clone <repository>
cd avatar-ai
npm install

# Start the development server
npm start
```

### Testing the RAG System
```bash
# In the browser console, you can test:
import('./src/rag/demo.js').then(demo => demo.runRAGDemo());
```

## 📁 File Structure

```
src/
├── rag/
│   ├── knowledge-extractor.js  # Michael's knowledge base
│   ├── rag-service.js         # RAG search & response logic
│   └── demo.js               # Testing utilities
├── App.js                    # Main application with RAG integration
├── converter.js              # Animation utilities
└── ...
```

## 🔧 Customization

### Adding New Knowledge
Edit `src/rag/knowledge-extractor.js` to add:
- New skills or technologies
- Additional projects
- Updated certifications
- Enhanced experience details

### Improving Search
The current system uses keyword-based search. For production:
- Implement vector embeddings (OpenAI, Sentence Transformers)
- Add semantic similarity scoring
- Include fuzzy matching for better recall

### Response Enhancement
Customize response generation in `rag-service.js`:
- Add personality traits
- Include context-aware follow-up questions
- Implement conversation memory

## 🎯 RAG Benefits

1. **Accurate Information**: Responses based on verified knowledge
2. **Up-to-date Content**: Easy to update knowledge base
3. **Contextual Awareness**: Relevant information for each query
4. **Scalable**: Can expand to include more detailed information
5. **Transparent**: Clear source attribution for responses

## 🚀 Future Enhancements

- **Vector Database Integration**: ChromaDB, Pinecone, or Weaviate
- **Advanced Embeddings**: Custom fine-tuned embeddings for Michael's domain
- **Multi-modal RAG**: Include images, documents, and code samples
- **Real-time Updates**: Sync with live portfolio/resume data
- **Conversation Memory**: Remember context across multiple interactions

## 🤝 Contributing

To enhance the RAG system:
1. Update knowledge in `knowledge-extractor.js`
2. Improve search algorithms in `rag-service.js`  
3. Add new query types and response patterns
4. Test with `demo.js` utilities

---

**Built with ❤️ for Michael McCullough's Portfolio**
- LinkedIn: [Michael McCullough](https://www.linkedin.com/in/mic-mcc/)
- GitHub: [macrilege](https://github.com/macrilege)
