# Portfolio Project Scripts

> **📚 This is a companion to the main [README.md](./README.md) - see there for full project overview and setup instructions.**

## Environment Management

Use the switch-env.sh script to manage Ollama server environments:

```bash
# Check current environment
./src/scripts/switch-env.sh

# Switch to local Ollama
./src/scripts/switch-env.sh local

# Switch to remote server
./src/scripts/switch-env.sh remote http://your-server:11434
```

## Directory Structure

- `src/threejs/` - All Three.js related code
- `src/views/` - UI view components
- `src/chatbot/` - LLM integration
- `src/scripts/` - Utility scripts
