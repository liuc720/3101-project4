// ========== 配置 ==========
const GRID_SIZE = 50; // 50x50 格子 (500x500 太多会卡,先用 50x50)
const CELL_SIZE = 12; // 每个格子 12px
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 600px

// 调色板颜色
const PALETTE_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008080', '#808080',
  '#FFC0CB', '#8B4513', '#A52A2A', '#DEB887', '#5F9EA0', '#7FFF00',
  '#D2691E', '#FF7F50', '#6495ED', '#DC143C', '#00FFFF', '#00008B',
  '#008B8B', '#B8860B', '#A9A9A9', '#006400', '#BDB76B', '#8B008B',
  '#556B2F', '#FF8C00', '#9932CC', '#8B0000', '#E9967A', '#8FBC8F'
];

// ========== 状态管理 ==========
let ws = null;
let canvas = null;
let ctx = null;
let currentColor = '#000000';
let currentTool = 'draw';
let roomId = '';
let username = '';
let gridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
let hoveredCell = null;
let isMouseDown = false; // 追踪鼠标按下状态
let lastDrawnCell = null; // 避免重复绘制同一格子

// Undo/Redo 历史记录
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50; // 最多保存50步

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  roomId = urlParams.get('room');
  username = urlParams.get('user');
  
  if (!roomId || !username) {
    alert('Invalid room or username!');
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('roomCode').textContent = `Room: ${roomId}`;
  
  initCanvas();
  initColorPalette();
  initEventListeners();
  connectWebSocket();
});

// ========== 画布初始化 ==========
function initCanvas() {
  canvas = document.getElementById('pixelCanvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  ctx = canvas.getContext('2d');
  
  drawGrid();
}

function drawGrid() {
  // 清空画布
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  
  // 绘制格子
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;
      
      // 如果有颜色就填充
      if (gridData[row][col]) {
        ctx.fillStyle = gridData[row][col];
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
      
      // 绘制格子边框
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
  
  // 高亮悬停的格子
  if (hoveredCell) {
    const { row, col } = hoveredCell;
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    
    ctx.strokeStyle = currentTool === 'erase' ? '#ff0000' : currentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
  }
}

// ========== 调色板初始化 ==========
function initColorPalette() {
  const palette = document.getElementById('colorPalette');
  
  PALETTE_COLORS.forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.className = 'color-btn';
    colorBtn.style.backgroundColor = color;
    colorBtn.addEventListener('click', () => selectColor(color, colorBtn));
    palette.appendChild(colorBtn);
  });
  
  selectColor(currentColor, palette.firstChild);
  
  document.getElementById('customColor').addEventListener('input', (e) => {
    selectColor(e.target.value);
  });
}

function selectColor(color, btn = null) {
  currentColor = color;
  document.getElementById('currentColorPreview').style.backgroundColor = color;
  document.getElementById('customColor').value = color;
  
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ========== 事件监听 ==========
function initEventListeners() {
  // 鼠标事件
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  
  // 全局鼠标释放事件(防止在canvas外释放)
  document.addEventListener('mouseup', handleMouseUp);
  
  // 工具选择
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTool = btn.dataset.tool;
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      if (currentTool === 'erase') {
        canvas.style.cursor = 'not-allowed';
      } else if (currentTool === 'fill') {
        canvas.style.cursor = 'cell';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    });
  });
  
  // Undo/Redo 按钮
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  
  // 键盘快捷键 Ctrl+Z / Ctrl+Y
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
  });
  
  document.getElementById('clearBtn').addEventListener('click', clearCanvas);
  document.getElementById('exportBtn').addEventListener('click', exportCanvas);
  document.getElementById('leaveBtn').addEventListener('click', leaveRoom);
  
  document.getElementById('zoomIn').addEventListener('click', () => zoomCanvas(1.2));
  document.getElementById('zoomOut').addEventListener('click', () => zoomCanvas(0.8));
  document.getElementById('zoomReset').addEventListener('click', () => zoomCanvas(1, true));
  
  // 更新 Undo/Redo 按钮状态
  updateUndoRedoButtons();
}

// ========== 画布交互 ==========
function handleMouseDown(e) {
  isMouseDown = true;
  lastDrawnCell = null;
  
  const cell = getCellFromEvent(e);
  if (!cell) return;
  
  if (currentTool === 'fill') {
    // 填充工具只在点击时触发,不支持拖动
    floodFill(cell.row, cell.col, currentColor);
  } else {
    // 绘制或擦除
    drawAtCell(cell.row, cell.col);
  }
}

function handleMouseMove(e) {
  const cell = getCellFromEvent(e);
  
  if (cell) {
    hoveredCell = { row: cell.row, col: cell.col };
    
    // 如果鼠标按下且不是填充工具,则继续绘制
    if (isMouseDown && currentTool !== 'fill') {
      const cellKey = `${cell.row},${cell.col}`;
      if (lastDrawnCell !== cellKey) {
        drawAtCell(cell.row, cell.col);
        lastDrawnCell = cellKey;
      }
    }
    
    drawGrid();
  }
}

function handleMouseUp(e) {
  isMouseDown = false;
  lastDrawnCell = null;
}

function handleMouseLeave(e) {
  hoveredCell = null;
  isMouseDown = false;
  lastDrawnCell = null;
  drawGrid();
}

function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  
  if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
    return { row, col };
  }
  return null;
}

function drawAtCell(row, col) {
  if (currentTool === 'draw') {
    fillCell(row, col, currentColor);
  } else if (currentTool === 'erase') {
    fillCell(row, col, null);
  }
}

function fillCell(row, col, color) {
  // 保存历史记录
  saveHistory();
  
  gridData[row][col] = color;
  drawGrid();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'draw',
      row: row,
      col: col,
      color: color
    }));
  }
}

// 填充工具
function floodFill(startRow, startCol, newColor) {
  const targetColor = gridData[startRow][startCol];
  if (targetColor === newColor) return;
  
  // 保存历史记录
  saveHistory();
  
  const stack = [[startRow, startCol]];
  const visited = new Set();
  
  while (stack.length > 0) {
    const [row, col] = stack.pop();
    const key = `${row},${col}`;
    
    if (visited.has(key)) continue;
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) continue;
    if (gridData[row][col] !== targetColor) continue;
    
    visited.add(key);
    gridData[row][col] = newColor;
    
    stack.push([row + 1, col]);
    stack.push([row - 1, col]);
    stack.push([row, col + 1]);
    stack.push([row, col - 1]);
  }
  
  drawGrid();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'fill',
      data: gridData
    }));
  }
  
  addActivity('Filled area');
}

function clearCanvas() {
  if (!confirm('Clear the entire canvas?')) return;
  
  // 保存历史记录
  saveHistory();
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'clear' }));
  }
  
  performClear();
}

function performClear() {
  gridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
  drawGrid();
  addActivity('Canvas cleared');
}

// ========== Undo/Redo 功能 ==========
function saveHistory() {
  // 如果当前不在历史记录末尾,删除后面的记录
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  
  // 深拷贝当前状态
  const stateCopy = gridData.map(row => [...row]);
  history.push(stateCopy);
  
  // 限制历史记录数量
  if (history.length > MAX_HISTORY) {
    history.shift();
  } else {
    historyIndex++;
  }
  
  updateUndoRedoButtons();
}

function undo() {
  if (historyIndex <= 0) {
    addActivity('Nothing to undo');
    return;
  }
  
  historyIndex--;
  gridData = history[historyIndex].map(row => [...row]);
  drawGrid();
  
  // 同步到服务器
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'fill',
      data: gridData
    }));
  }
  
  updateUndoRedoButtons();
  addActivity('Undo');
}

function redo() {
  if (historyIndex >= history.length - 1) {
    addActivity('Nothing to redo');
    return;
  }
  
  historyIndex++;
  gridData = history[historyIndex].map(row => [...row]);
  drawGrid();
  
  // 同步到服务器
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'fill',
      data: gridData
    }));
  }
  
  updateUndoRedoButtons();
  addActivity('Redo');
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  
  if (undoBtn && redoBtn) {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
    
    undoBtn.style.opacity = undoBtn.disabled ? '0.3' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.3' : '1';
    undoBtn.style.cursor = undoBtn.disabled ? 'not-allowed' : 'pointer';
    redoBtn.style.cursor = redoBtn.disabled ? 'not-allowed' : 'pointer';
  }
}

function exportCanvas() {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-art-${roomId}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity('Canvas exported');
  });
}

let currentZoom = 1;
function zoomCanvas(factor, reset = false) {
  if (reset) {
    currentZoom = 1;
  } else {
    currentZoom *= factor;
    currentZoom = Math.max(0.5, Math.min(currentZoom, 3));
  }
  
  canvas.style.transform = `scale(${currentZoom})`;
  canvas.style.transformOrigin = 'top left';
  document.getElementById('zoomLevel').textContent = `${Math.round(currentZoom * 100)}%`;
}

function leaveRoom() {
  if (confirm('Leave this room?')) {
    if (ws) ws.close();
    window.location.href = 'index.html';
  }
}

// ========== WebSocket ==========
function connectWebSocket() {
  // 连接到 Render 后端服务器
  const wsUrl = 'wss://three101-project4-7cru.onrender.com';
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ Connected');
    updateConnectionStatus('connected');
    
    ws.send(JSON.stringify({
      type: 'join',
      roomId: roomId,
      userId: username
    }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('❌ Error:', error);
    updateConnectionStatus('disconnected');
  };
  
  ws.onclose = () => {
    console.log('👋 Disconnected');
    updateConnectionStatus('disconnected');
    addActivity('Disconnected');
    
    setTimeout(() => {
      addActivity('Reconnecting...');
      connectWebSocket();
    }, 3000);
  };
}

function handleWebSocketMessage(data) {
  switch(data.type) {
    case 'init':
      gridData = data.canvas;
      // 初始化时保存第一个历史记录
      history = [gridData.map(row => [...row])];
      historyIndex = 0;
      updateUndoRedoButtons();
      drawGrid();
      updateUserCount(data.userCount);
      addActivity('Canvas loaded');
      break;
      
    case 'draw':
      gridData[data.row][data.col] = data.color;
      drawGrid();
      break;
      
    case 'fill':
      gridData = data.data;
      drawGrid();
      break;
      
    case 'clear':
      performClear();
      break;
      
    case 'userJoined':
      updateUserCount(data.userCount);
      addActivity(`${data.userId} joined`);
      break;
      
    case 'userLeft':
      updateUserCount(data.userCount);
      addActivity(`${data.userId} left`);
      break;
      
    case 'error':
      alert(data.message);
      window.location.href = 'index.html';
      break;
  }
}

// ========== UI 更新 ==========
function updateConnectionStatus(status) {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.className = 'status-badge ' + status;
  
  const statusText = {
    'connected': '🟢 Connected',
    'connecting': '🟡 Connecting...',
    'disconnected': '🔴 Disconnected'
  };
  
  statusEl.textContent = statusText[status] || status;
}

function updateUserCount(count) {
  document.getElementById('userCount').textContent = `👤 ${count}/2`;
}

function addActivity(message) {
  const log = document.getElementById('activityLog');
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  log.insertBefore(item, log.firstChild);
  
  while (log.children.length > 10) {
    log.removeChild(log.lastChild);
  }
}