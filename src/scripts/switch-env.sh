#!/bin/bash

# Environment switcher for Ollama server
# Usage: ./switch-env.sh [local|remote] [server-url]

ENV_FILE=".env"

if [ $# -eq 0 ]; then
    echo "Current environment configuration:"
    echo "================================"
    if [ -f "$ENV_FILE" ]; then
        cat "$ENV_FILE"
    else
        echo "No .env file found. Creating default configuration..."
        echo "OLLAMA_ENVIRONMENT=local" > "$ENV_FILE"
        echo "OLLAMA_LOCAL_URL=http://localhost:11434" >> "$ENV_FILE"
        echo "OLLAMA_REMOTE_URL=http://localhost:11434" >> "$ENV_FILE"
        echo "NODE_ENV=development" >> "$ENV_FILE"
        cat "$ENV_FILE"
    fi
    exit 0
fi

ENVIRONMENT=$1
SERVER_URL=$2

if [ "$ENVIRONMENT" != "local" ] && [ "$ENVIRONMENT" != "remote" ]; then
    echo "Error: Environment must be 'local' or 'remote'"
    echo "Usage: ./switch-env.sh [local|remote] [server-url]"
    exit 1
fi

if [ "$ENVIRONMENT" = "remote" ] && [ -z "$SERVER_URL" ]; then
    echo "Error: Server URL required for remote environment"
    echo "Usage: ./switch-env.sh remote http://your-server:11434"
    exit 1
fi

# Create or update .env file
echo "# Ollama Server Configuration" > "$ENV_FILE"
echo "# Set to 'local' for localhost, 'remote' for server deployment" >> "$ENV_FILE"
echo "OLLAMA_ENVIRONMENT=$ENVIRONMENT" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Local Ollama Server (default)" >> "$ENV_FILE"
echo "OLLAMA_LOCAL_URL=http://localhost:11434" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# Remote Ollama Server (when OLLAMA_ENVIRONMENT=remote)" >> "$ENV_FILE"

if [ "$ENVIRONMENT" = "remote" ]; then
    echo "OLLAMA_REMOTE_URL=$SERVER_URL" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Optional: Authentication for remote server" >> "$ENV_FILE"
    echo "# OLLAMA_API_KEY=your-api-key-here" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Development/Production mode" >> "$ENV_FILE"
    echo "NODE_ENV=development" >> "$ENV_FILE"
    
    echo "✅ Switched to REMOTE environment"
    echo "🌐 Server URL: $SERVER_URL"
    echo "📝 Don't forget to restart your dev server!"
else
    echo "OLLAMA_REMOTE_URL=http://localhost:11434" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Optional: Authentication for remote server" >> "$ENV_FILE"
    echo "# OLLAMA_API_KEY=your-api-key-here" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Development/Production mode" >> "$ENV_FILE"
    echo "NODE_ENV=development" >> "$ENV_FILE"
    
    echo "✅ Switched to LOCAL environment"
    echo "🏠 Using localhost:11434"
fi

echo ""
echo "Current configuration:"
echo "====================="
cat "$ENV_FILE"
