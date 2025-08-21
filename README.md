# Portfolio Site

Welcome to my portfolio website repository! This project showcases my work, skills, and professional experience.

## 🚀 About

This is a personal portfolio website built to demonstrate my technical abilities and showcase my projects.

## 🛠️ Technologies

- **Three.js** - 3D graphics and animations
- **TypeScript** - Type-safe JavaScript development
- **HTML5** - Semantic markup and structure
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Ollama** - Local LLM integration for AI chat

## 📁 Project Structure

```
portfolio/
├── README.md
├── SCRIPTS_README.md          # Scripts and environment management
├── src/
│   ├── threejs/               # Three.js 3D graphics and animations
│   │   ├── constants.ts       # Colors, materials, geometry constants
│   │   ├── utils.ts           # Utility functions and calculations
│   │   ├── geometry.ts        # 3D circle creation
│   │   ├── camera-manager.ts  # Camera controls and positioning
│   │   ├── lighting.ts        # Scene lighting setup
│   │   └── animation-manager.ts # Animation system and effects
│   ├── views/                 # UI view components
│   ├── chatbot/               # AI chat integration
│   │   ├── chatbot.ts         # Core LLM logic
│   │   ├── chat-ui.ts         # Chat interface
│   │   ├── models.ts          # Model configurations
│   │   └── config.ts          # Environment configuration
│   ├── scripts/               # Utility scripts
│   │   └── switch-env.sh      # Environment switcher
│   └── main.ts                # Main application entry point
├── .env                       # Environment variables
├── .env.example               # Environment template
└── package.json
```

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Ollama (for AI chat):**
   ```bash
   # Download from https://ollama.ai/download
   # Or use Homebrew: brew install ollama
   
   # Start Ollama
   ollama serve
   
   # Download a model
   ollama pull gemma3:1b
   ```

3. **Configure environment:**
   ```bash
   # Check current config
   ./src/scripts/switch-env.sh
   
   # Switch to local
   ./src/scripts/switch-env.sh local
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Preview production build:**
   ```bash
   npm run preview
   ```

> **📚 See [SCRIPTS_README.md](./SCRIPTS_README.md) for detailed script usage and environment management.**

## 📱 Features

- ✅ Interactive 3D background with Three.js
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety
- ✅ Modern development workflow with Vite
- ✅ Real-time 3D animations
- ✅ AI Chat integration with Ollama
- ✅ Environment-based configuration (local/remote)
- ✅ Modular animation system
- ✅ Clean code architecture
- 🔄 Portfolio content (coming soon)
- 🔄 Project showcase (coming soon)
- 🔄 Contact form (coming soon)

## 🔧 Development

- **Development server:** Runs on `http://localhost:3000`
- **Hot reload:** Automatic browser refresh on file changes
- **TypeScript compilation:** Real-time type checking
- **Tailwind CSS:** JIT compilation for fast development
- **Three.js:** WebGL rendering with fallback support
- **Ollama integration:** Local AI model support
- **Environment switching:** Easy local/remote server switching
- **Animation testing:** Built-in animation test button

## 🚀 AI Chat Features

- **Local LLM support** via Ollama
- **Environment switching** between local and remote servers
- **Model management** with easy model swapping
- **Fallback system** for offline functionality
- **Real-time chat** with AI responses

## 🎬 Animation System

- **Modular animation manager** for clean code separation
- **Multiple animation types** with individual trigger buttons
- **Smooth easing functions** for professional animations
- **Event-driven architecture** for UI ↔ 3D communication
- **Animation types available:**
  - 🌀 **Spin Animation** - Smooth 360° rotation with seamless loop
  - 🌊 **Mexican Wave** - Tubes extend outward in wave pattern
  - 🦘 **Bounce Animation** - Circle radius expands and contracts
  - 🤸 **Backflip** - Circle does a complete backflip while staying centered
  - 🎡 **Multi-Axis Spin** - Spins on all axes with different speeds

## 📄 License

[License information to be added]

## 📞 Contact

[Your contact information to be added]

---

*This portfolio is a work in progress. More content and features coming soon!*
