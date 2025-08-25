// Knowledge Extractor for Michael Site RAG System
// This module extracts and structures content from michael-site for RAG

// Michael's professional information extracted from michael-site
export const MICHAEL_KNOWLEDGE_BASE = {
  personal: {
    name: "Michael McCullough",
    title: "Senior AI Engineer & Software Architect", 
    specialties: [
      "LLM Fine-tuning", 
      "RAG Systems", 
      "ML Infrastructure", 
      "AI-Powered Applications",
      "Front-end Development",
      "AI model fine-tuning"
    ],
    description: "Senior Software Engineer Lead & AI Engineer specializing in Front-end, AI model fine-tuning, RAG systems, and infrastructure",
    links: {
      linkedin: "https://www.linkedin.com/in/mic-mcc/",
      codepen: "https://codepen.io/macrilege", 
      github: "https://github.com/macrilege"
    }
  },

  skills: {
    aiMachineLearning: [
      "LLM Fine-tuning & Optimization",
      "RAG Systems & Vector Databases", 
      "Transformer Architectures",
      "PyTorch & TensorFlow",
      "Hugging Face Ecosystem",
      "Model Deployment & Serving",
      "Custom embedding fine-tuning",
      "Multi-modal retrieval",
      "Production-scale deployment"
    ],
    backendInfrastructure: [
      "Python & FastAPI",
      "Node.js & Hono Framework", 
      "Distributed Training",
      "Cloud ML Platforms",
      "Docker & Kubernetes",
      "API Development"
    ],
    frontend: [
      "React",
      "TypeScript", 
      "JavaScript",
      "HTML/CSS",
      "UI/UX Design",
      "Three.js",
      "WebGL",
      "Real-time AI integration",
      "Responsive AI interfaces"
    ],
    databases: [
      "ChromaDB",
      "Vector Databases",
      "PostgreSQL",
      "MongoDB"
    ]
  },

  certifications: [
    {
      title: "Deep Learning Specialization",
      issuer: "DeepLearning.AI",
      date: "Apr 2025",
      credentialId: "4FD6OHD6D8UG",
      verificationUrl: "https://www.coursera.org/account/accomplishments/specialization/4FD6OHD6D8UG"
    },
    {
      title: "Principles of UX/UI Design", 
      issuer: "Meta",
      date: "Apr 2025",
      credentialId: "A3Q6RTHSATYW",
      verificationUrl: "https://www.coursera.org/account/accomplishments/verify/A3Q6RTHSATYW"
    },
    {
      title: "Programming in Python",
      issuer: "Meta", 
      date: "Apr 2025",
      credentialId: "7YVBKIWRBYI1",
      verificationUrl: "https://www.coursera.org/account/accomplishments/verify/7YVBKIWRBYI1"
    },
    {
      title: "Python Programming Fundamentals",
      issuer: "Microsoft",
      date: "Apr 2025", 
      credentialId: "601VP0FQQVPP",
      verificationUrl: "https://www.coursera.org/account/accomplishments/records/601VP0FQQVPP"
    },
    {
      title: "Google AI Essentials",
      issuer: "Google",
      date: "Mar 2025",
      credentialId: "86T245NTBQ1Z",
      verificationUrl: "https://www.coursera.org/account/accomplishments/records/86T245NTBQ1Z"
    },
    {
      title: "HTML and CSS in depth",
      issuer: "Meta",
      date: "Mar 2025", 
      credentialId: "Q6P4FRC5JU0R",
      verificationUrl: "https://www.coursera.org/account/accomplishments/verify/Q6P4FRC5JU0R"
    },
    {
      title: "Programming with JavaScript",
      issuer: "Meta",
      date: "Mar 2025",
      credentialId: "USJFKKJM4JSR", 
      verificationUrl: "https://www.coursera.org/account/accomplishments/verify/USJFKKJM4JSR"
    },
    {
      title: "HTML/CSS and React",
      issuer: "TestDome",
      date: "Nov 2019",
      credentialId: "5c23b5965ac84030ad532921fddc0a7d",
      verificationUrl: "https://www.testdome.com/cert/5c23b5965ac84030ad532921fddc0a7d"
    }
  ],

  projects: [
    {
      id: 1,
      title: "RAG-Powered Knowledge System", 
      description: "Advanced retrieval-augmented generation system with fine-tuned embeddings and optimized vector search",
      technologies: ["Python", "PyTorch", "LangChain", "ChromaDB", "FastAPI"],
      status: "live",
      category: "ai-engineering",
      highlights: ["Custom embedding fine-tuning", "Multi-modal retrieval", "Production-scale deployment"]
    },
    {
      id: 2,
      title: "Custom LLM Fine-tuning Pipeline",
      description: "End-to-end pipeline for domain-specific model fine-tuning with automated evaluation and deployment", 
      technologies: ["Transformers", "LoRA/QLoRA", "Weights & Biases", "Docker", "MLOps"],
      status: "live",
      category: "ai-engineering", 
      highlights: ["Parameter-efficient fine-tuning", "Automated evaluation", "CI/CD for ML models"]
    },
    {
      id: 3, 
      title: "Intelligent AI Chatbot Platform",
      description: "Multi-modal conversational AI with custom knowledge bases, memory, and adaptive response generation",
      technologies: ["Ollama", "OpenAI API", "LangChain", "React", "WebSocket", "Voice APIs"],
      status: "live",
      category: "ai-chatbots",
      highlights: ["Context-aware conversations", "Custom knowledge integration", "Real-time streaming responses", "Memory persistence"]
    },
    {
      id: 4,
      title: "AI-Powered Web Applications", 
      description: "Modern React interfaces integrated with AI models for intelligent user experiences",
      technologies: ["React", "TypeScript", "OpenAI API", "Cloudflare Workers"],
      link: "https://codepen.io/macrilege",
      status: "ongoing",
      category: "ai-applications",
      highlights: ["Real-time AI integration", "Responsive AI interfaces", "Creative AI demos"]
    }
  ],

  experience: {
    summary: "Michael is a Senior Software Engineer Lead & AI Engineer with extensive experience in AI/ML systems, particularly in LLM fine-tuning, RAG systems, and AI-powered applications. He specializes in both front-end development and backend AI infrastructure.",
    expertise: [
      "Building production-scale RAG systems with custom embeddings",
      "Fine-tuning large language models for domain-specific applications", 
      "Developing AI-powered web applications with React and TypeScript",
      "Implementing MLOps pipelines for model training and deployment",
      "Creating intelligent chatbot platforms with memory and context awareness",
      "Optimizing vector databases and search systems for AI applications"
    ]
  }
};

// Convert knowledge base to searchable text chunks
export const createKnowledgeChunks = () => {
  const chunks = [];
  
  // Personal information chunk
  chunks.push({
    id: 'personal',
    content: `Michael McCullough is a ${MICHAEL_KNOWLEDGE_BASE.personal.title}. He specializes in ${MICHAEL_KNOWLEDGE_BASE.personal.specialties.join(', ')}. ${MICHAEL_KNOWLEDGE_BASE.personal.description}`,
    category: 'personal',
    metadata: MICHAEL_KNOWLEDGE_BASE.personal
  });

  // Skills chunks
  Object.entries(MICHAEL_KNOWLEDGE_BASE.skills).forEach(([category, skills]) => {
    chunks.push({
      id: `skills-${category}`,
      content: `Michael's ${category.replace(/([A-Z])/g, ' $1').toLowerCase()} skills include: ${skills.join(', ')}`,
      category: 'skills', 
      subcategory: category,
      metadata: { category, skills }
    });
  });

  // Certification chunks
  MICHAEL_KNOWLEDGE_BASE.certifications.forEach((cert, index) => {
    chunks.push({
      id: `cert-${index}`,
      content: `Michael has certification in "${cert.title}" from ${cert.issuer}, earned in ${cert.date}. Credential ID: ${cert.credentialId}`,
      category: 'certifications',
      metadata: cert
    });
  });

  // Project chunks
  MICHAEL_KNOWLEDGE_BASE.projects.forEach(project => {
    chunks.push({
      id: `project-${project.id}`,
      content: `${project.title}: ${project.description}. Technologies used: ${project.technologies.join(', ')}. Status: ${project.status}. Key highlights: ${project.highlights.join(', ')}`,
      category: 'projects',
      subcategory: project.category,
      metadata: project
    });
  });

  // Experience chunk
  chunks.push({
    id: 'experience',
    content: `${MICHAEL_KNOWLEDGE_BASE.experience.summary} His expertise includes: ${MICHAEL_KNOWLEDGE_BASE.experience.expertise.join('; ')}`,
    category: 'experience', 
    metadata: MICHAEL_KNOWLEDGE_BASE.experience
  });

  return chunks;
};

export default MICHAEL_KNOWLEDGE_BASE;
