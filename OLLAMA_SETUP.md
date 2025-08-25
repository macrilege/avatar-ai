# Ollama Setup Instructions

## Installing Ollama

1. **Download and Install Ollama:**
   - Visit [https://ollama.com](https://ollama.com)
   - Download the installer for your operating system
   - Follow the installation instructions

2. **Install a Model:**
   ```bash
   # Install Llama 3.2 (recommended)
   ollama pull llama3.2
   
   # Alternative models you can try:
   # ollama pull llama3.2:1b    # Smaller, faster
   # ollama pull mistral        # Alternative model
   # ollama pull codellama      # For code-related conversations
   ```

3. **Start Ollama Server:**
   ```bash
   ollama serve
   ```
   
   This will start the Ollama server on `http://localhost:11434`

4. **Verify Installation:**
   ```bash
   # Test the API
   curl http://localhost:11434/api/generate -d '{
     "model": "llama3.2",
     "prompt": "Hello!",
     "stream": false
   }'
   ```

## Configuration

The application is configured to use:
- **Model**: `llama3.2` (you can change this in `src/App.js`)
- **Host**: `http://localhost:11434`
- **Streaming**: Disabled for better integration

## Troubleshooting

1. **CORS Issues**: 
   - Ollama typically allows localhost connections by default
   - If you encounter CORS issues, you may need to configure Ollama's CORS settings

2. **Model Not Found**:
   - Make sure you've pulled the model: `ollama pull llama3.2`
   - Check available models: `ollama list`

3. **Connection Refused**:
   - Ensure Ollama server is running: `ollama serve`
   - Check if port 11434 is available

4. **Slow Responses**:
   - Try a smaller model like `llama3.2:1b`
   - Ensure you have sufficient RAM (8GB+ recommended)

## Voice Setup

The application uses the browser's built-in Web Speech API for text-to-speech:

- **Female Voice**: The app automatically selects the best available female voice
- **Fallback**: If no female voice is found, it uses the default English voice
- **Browser Support**: Works in Chrome, Edge, Safari, and most modern browsers
- **No Internet Required**: Everything runs locally!

## Model Recommendations

- **llama3.2** (7B): Best quality, requires ~8GB RAM
- **llama3.2:1b** (1B): Faster responses, requires ~2GB RAM  
- **mistral** (7B): Alternative high-quality model
- **phi3** (3.8B): Good balance of speed and quality

To change the model, edit the `model` field in the `getOllamaResponse` function in `src/App.js`.
