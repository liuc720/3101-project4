const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static('public'));

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 存储房间和连接
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('👤 New client connected');
  
  let currentRoom = null;
  let userId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch(data.type) {
        case 'join':
          handleJoin(ws, data);
          break;
        case 'draw':
          handleDraw(ws, data);
          break;
        case 'fill':
          handleFill(ws, data);
          break;
        case 'clear':
          handleClear(ws, data);
          break;
        case 'export':
          handleExport(ws, data);
          break;
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.clients = room.clients.filter(client => client !== ws);
      
      // 通知其他用户
      broadcastToRoom(currentRoom, {
        type: 'userLeft',
        userId: userId
      }, ws);
      
      // 如果房间空了,删除房间
      if (room.clients.length === 0) {
        rooms.delete(currentRoom);
        console.log(`🗑️  Room ${currentRoom} deleted`);
      }
    }
    console.log('👋 Client disconnected');
  });

  function handleJoin(ws, data) {
    const roomId = data.roomId;
    userId = data.userId;
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        clients: [],
        canvas: Array(50).fill().map(() => Array(50).fill(null))
      });
      console.log(`🏠 Room ${roomId} created`);
    }
    
    const room = rooms.get(roomId);
    
    // 检查房间是否已满
    if (room.clients.length >= 2) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Room is full'
      }));
      return;
    }
    
    room.clients.push(ws);
    currentRoom = roomId;
    
    // 发送当前画布状态
    ws.send(JSON.stringify({
      type: 'init',
      canvas: room.canvas,
      userCount: room.clients.length
    }));
    
    // 通知其他用户
    broadcastToRoom(roomId, {
      type: 'userJoined',
      userId: userId,
      userCount: room.clients.length
    }, ws);
    
    console.log(`✅ User ${userId} joined room ${roomId} (${room.clients.length}/2)`);
  }

  function handleDraw(ws, data) {
    if (!currentRoom || !rooms.has(currentRoom)) return;
    
    const room = rooms.get(currentRoom);
    const { row, col, color } = data;
    
    // 更新服务器端画布状态
    if (row >= 0 && row < 50 && col >= 0 && col < 50) {
      room.canvas[row][col] = color;
    }
    
    // 广播给房间内其他用户
    broadcastToRoom(currentRoom, {
      type: 'draw',
      row: row,
      col: col,
      color: color,
      userId: userId
    }, ws);
  }

  function handleFill(ws, data) {
    if (!currentRoom || !rooms.has(currentRoom)) return;
    
    const room = rooms.get(currentRoom);
    room.canvas = data.data;
    
    broadcastToRoom(currentRoom, {
      type: 'fill',
      data: data.data
    }, ws);
  }

  function handleClear(ws, data) {
    if (!currentRoom || !rooms.has(currentRoom)) return;
    
    const room = rooms.get(currentRoom);
    room.canvas = Array(50).fill().map(() => Array(50).fill(null));
    
    // 广播给房间内所有用户(包括自己)
    broadcastToRoom(currentRoom, {
      type: 'clear'
    });
  }

  function handleExport(ws, data) {
    if (!currentRoom || !rooms.has(currentRoom)) return;
    
    const room = rooms.get(currentRoom);
    ws.send(JSON.stringify({
      type: 'exportData',
      canvas: room.canvas
    }));
  }

  function broadcastToRoom(roomId, message, excludeWs = null) {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    const messageStr = JSON.stringify(message);
    
    room.clients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
});

console.log('🎨 Pixel Collaboration Server initialized');
console.log('📝 Rooms will be created automatically when users join');