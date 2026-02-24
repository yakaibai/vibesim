// Context menu manager module

let blockContextMenu = null;
let canvasContextMenu = null;
let svg = null;
let state = null;
let rendererRef = null;
let fitToDiagram = null;
let renderInspector = null;
let focusPropertiesPanel = null;

export function setContextMenus(blockMenu, canvasMenu) {
  blockContextMenu = blockMenu;
  canvasContextMenu = canvasMenu;
}

export function setStateRef(ref) {
  state = ref;
}

export function setRendererRef(ref) {
  rendererRef = ref;
}

export function setFitToDiagram(fn) {
  fitToDiagram = fn;
}

export function setRenderInspector(fn) {
  renderInspector = fn;
}

export function setFocusPropertiesPanel(fn) {
  focusPropertiesPanel = fn;
}

export function setSvg(el) {
  svg = el;
}

function hideAllContextMenus() {
  if (blockContextMenu) {
    blockContextMenu.classList.remove('show');
  }
  if (canvasContextMenu) {
    canvasContextMenu.classList.remove('show');
  }
}

function showContextMenu(menu, x, y) {
  hideAllContextMenus();
  
  const menuWidth = menu.offsetWidth || 200;
  const menuHeight = menu.offsetHeight || 150;
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let posX = x;
  let posY = y;
  
  if (posX + menuWidth > viewportWidth) {
    posX = viewportWidth - menuWidth - 10;
  }
  
  if (posY + menuHeight > viewportHeight) {
    posY = viewportHeight - menuHeight - 10;
  }
  
  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;
  menu.classList.add('show');
}

function handleBlockContextMenu(event, blockId) {
  event.preventDefault();
  event.stopPropagation();
  
  state.selectedId = blockId;
  showContextMenu(blockContextMenu, event.clientX, event.clientY);
}

function handleCanvasContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  
  showContextMenu(canvasContextMenu, event.clientX, event.clientY);
}

function handleBlockAction(action) {
  hideAllContextMenus();
  
  if (!state.selectedId) return;
  
  const block = state.blocks.get(state.selectedId);
  if (!block) return;
  
  switch (action) {
    case 'mirrorHorizontal':
      // 水平镜像：左右翻转
      if (!block.mirrorHorizontal) block.mirrorHorizontal = false;
      block.mirrorHorizontal = !block.mirrorHorizontal;
      // 更新端口位置，以模块中心为对称轴镜像
      const centerX = block.width / 2;
      block.ports.forEach(port => {
        // 计算镜像后的x坐标
        const mirroredX = centerX + (centerX - port.x);
        port.x = mirroredX;
        port.wireX = mirroredX;
        // 更新端口元素位置
        if (port.el) {
          const hit = port.el.querySelector('.port-hit');
          if (hit) {
            hit.setAttribute('cx', mirroredX);
          }
          const shape = port.el.querySelector('.port');
          if (shape) {
            if (shape.tagName.toLowerCase() === 'rect') {
              shape.setAttribute('x', mirroredX - 6);
            } else {
              shape.setAttribute('cx', mirroredX);
            }
          }
        }
      });
      rendererRef.current?.updateBlockTransform(block);
      state.routingDirty = true;
      if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
      state.fastRouting = false;
      rendererRef.current?.updateConnections(true);
      break;
      
    case 'mirrorVertical':
      // 垂直镜像：上下翻转
      if (!block.mirrorVertical) block.mirrorVertical = false;
      block.mirrorVertical = !block.mirrorVertical;
      // 更新端口位置，以模块中心为对称轴镜像
      const centerY = block.height / 2;
      block.ports.forEach(port => {
        // 计算镜像后的y坐标
        const mirroredY = centerY + (centerY - port.y);
        port.y = mirroredY;
        port.wireY = mirroredY;
        // 更新端口元素位置
        if (port.el) {
          const hit = port.el.querySelector('.port-hit');
          if (hit) {
            hit.setAttribute('cy', mirroredY);
          }
          const shape = port.el.querySelector('.port');
          if (shape) {
            if (shape.tagName.toLowerCase() === 'rect') {
              shape.setAttribute('y', mirroredY - 6);
            } else {
              shape.setAttribute('cy', mirroredY);
            }
          }
        }
      });
      rendererRef.current?.updateBlockTransform(block);
      state.routingDirty = true;
      if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
      state.fastRouting = false;
      rendererRef.current?.updateConnections(true);
      break;
      
    case 'rotateLeft':
      block.rotation = ((block.rotation || 0) - 90 + 360) % 360;
      rendererRef.current?.updateBlockTransform(block);
      state.routingDirty = true;
      if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
      state.fastRouting = false;
      rendererRef.current?.updateConnections(true);
      break;
      
    case 'rotateRight':
      block.rotation = ((block.rotation || 0) + 90) % 360;
      rendererRef.current?.updateBlockTransform(block);
      state.routingDirty = true;
      if (state.dirtyBlocks) state.dirtyBlocks.add(block.id);
      state.fastRouting = false;
      rendererRef.current?.updateConnections(true);
      break;
      
    case 'delete':
      if (state.selectedId) {
        rendererRef.current?.deleteBlock(state.selectedId);
        state.selectedId = null;
        if (state.selectedIds) {
          state.selectedIds.delete(state.selectedId);
        }
      }
      break;
  }
}

function handleCanvasAction(action) {
  hideAllContextMenus();
  
  switch (action) {
    case 'resetView':
      if (fitToDiagram) {
        fitToDiagram();
      }
      break;
      
    case 'selectAll':
      if (state && state.blocks) {
        const allBlockIds = Array.from(state.blocks.keys());
        if (state.selectedIds) {
          state.selectedIds.clear();
        }
        allBlockIds.forEach(id => state.selectedIds.add(id));
        if (allBlockIds.length > 0) {
          state.selectedId = allBlockIds[0];
        }
        rendererRef.current?.updateSelectionBox();
      }
      break;
  }
}

export function initContextMenu() {
  if (!svg || !state || !rendererRef) return;
  
  svg.addEventListener('contextmenu', (event) => {
    const target = event.target;
    
    const blockElement = target.closest('[data-block-id]');
    if (blockElement) {
      const blockId = blockElement.getAttribute('data-block-id');
      handleBlockContextMenu(event, blockId);
      return;
    }
    
    handleCanvasContextMenu(event);
  });
  
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) {
      hideAllContextMenus();
    }
  });
  
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideAllContextMenus();
    }
  });
  
  if (blockContextMenu) {
    const blockMenuItems = blockContextMenu.querySelectorAll('.context-menu-item');
    blockMenuItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        handleBlockAction(action);
      });
    });
  }
  
  if (canvasContextMenu) {
    const canvasMenuItems = canvasContextMenu.querySelectorAll('.context-menu-item');
    canvasMenuItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        handleCanvasAction(action);
      });
    });
  }
}
