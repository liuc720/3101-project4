# 🎨 3101-Project4: Collaborative Pixel Art Canvas

Assignment 4: Real-Time Collaboration Application 
A WebSocket-based collaborative pixel art application where two users can draw together in real-time on a shared 50x50 grid canvas.

**Live Demo**: [https://liuc720.github.io/3101-project4/](https://liuc720.github.io/3101-project4/)  
**Backend Server**: [https://three101-project4-7cru.onrender.com/](https://three101-project4-7cru.onrender.com/)

## Features

Core Functionality
- 🎨 **50x50 Pixel Grid Canvas** - Large collaborative workspace with visible grid cells
- 🌈 **36-Color Palette** + Custom color picker for unlimited color options
- 👥 **Real-Time Collaboration** - See your partner's actions instantly
- 🏠 **Room System** - Connect with friends using unique room codes
- 🔒 **Two-User Limit** - Focused 1-on-1 collaboration experience

Drawing Tools
- ✏️ **Draw Tool** - Click or drag to fill grid cells with color
- 🧹 **Eraser** - Remove colors and restore cells to blank state
- 🪣 **Fill Tool** - Flood fill connected areas with one click (like paint bucket)

Advanced Features
- ↶↷ **Undo/Redo** - Up to 50 steps of history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- 🖱️ **Drag Drawing** - Hold and drag mouse to continuously fill or erase cells
- 🔍 **Zoom Controls** - Scale canvas from 50% to 300% for detailed work
- 💾 **Export to PNG** - Download your collaborative artwork
- 📊 **Live Status Indicators** - Connection status, user count, and activity log
- ✨ **Cell Hover Highlight** - Visual feedback showing which cell you're about to fill

---

## How to Use

Creating/Joining a Room

1. Visit the application homepage
2. Enter your username
3. Either:
   - Enter an existing room code to join a friend
   - Click "Create Random Room" to generate a new room
4. Share the room code with your collaborator

Drawing Together

1. **Select a Color** - Choose from the palette or use the custom color picker
2. **Choose a Tool**:
   - **Draw (✏️)**: Click or drag to fill cells
   - **Erase (🧹)**: Click or drag to remove colors
   - **Fill (🪣)**: Click to flood fill connected areas
3. **Draw on Canvas** - Your partner sees changes instantly!
4. **Undo/Redo** - Use buttons or keyboard shortcuts (Ctrl+Z/Y)
5. **Export** - Click 💾 to download your collaborative artwork