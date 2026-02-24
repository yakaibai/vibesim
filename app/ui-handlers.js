import { state, getFitToDiagram } from './state.js';
import { toYAML, serializeDiagram, parseYAML, sanitizeFilename } from './file-operations.js';
import { showConfirmSaveModal } from './modal-handlers.js';
import { handleMenuAction, setFileOpenInput, setDeleteSelectionBtn, performOpen, newDiagram } from './menu-handlers.js';
import { loadDiagram } from './diagram-handlers.js';
import { getViewBox, setViewBox, getZoomScale, setZoomScale, getUpdateStatusBar, getViewportSize } from './workspace-handlers.js';

let statusEl = null;
let homeBtn = null;
let zoomInBtn = null;
let zoomOutBtn = null;

export function setStatusElRef(el) {
  statusEl = el;
}

export function setHomeBtnRef(el) {
  homeBtn = el;
}

export function setZoomInBtnRef(el) {
  zoomInBtn = el;
}

export function setZoomOutBtnRef(el) {
  zoomOutBtn = el;
}

export function initSidebarUI() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  const activityIcons = document.querySelectorAll('.activity-icon');
  const sidebarPanels = document.querySelectorAll('.sidebar-panel');
  const activitybar = document.querySelector('.activity-bar');
  const sidebar = document.querySelector('.sidebar');
  
  console.log('initSidebarUI() - activityIcons:', activityIcons.length);
  console.log('initSidebarUI() - sidebarPanels:', sidebarPanels.length);
  
  if (activitybar && sidebar) {
    activitybar.addEventListener('dblclick', (e) => {
      console.log('double click on activitybar, target:', e.target);
      console.log('sidebar.classList before toggle:', sidebar.classList);
      sidebar.classList.toggle('collapsed');
      console.log('sidebar.classList after toggle:', sidebar.classList);
      console.log('sidebar.offsetWidth after toggle:', sidebar.offsetWidth);
      
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      
      if (!sidebar.classList.contains('collapsed')) {
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
          sidebar.style.width = savedWidth;
        }
      }
    });
  }
  
  const resizeHandle = document.querySelector('.sidebar-resize-handle');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  if (resizeHandle && sidebar) {
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      sidebar.style.transition = 'none';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
      sidebar.style.width = `${newWidth}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        sidebar.style.transition = 'width 0.15s ease';
        localStorage.setItem('sidebarWidth', sidebar.style.width);
      }
    });
  }
  
  const savedWidth = localStorage.getItem('sidebarWidth');
  const savedCollapsed = localStorage.getItem('sidebarCollapsed');
  if (sidebar) {
    if (savedCollapsed === 'true') {
      sidebar.classList.add('collapsed');
    } else if (savedWidth) {
      sidebar.style.width = savedWidth;
    }
  }
  
  activityIcons.forEach(icon => {
    icon.addEventListener('click', () => {
      const panelId = icon.dataset.panel;
      console.log('面板点击 - panelId:', panelId);
      
      if (!panelId) return;
      
      activityIcons.forEach(i => i.classList.remove('active'));
      icon.classList.add('active');
      
      sidebarPanels.forEach(panel => {
        console.log('检查面板 - panel.id:', panel.id, '目标:', `panel-${panelId}`);
        panel.classList.remove('active');
        if (panel.id === `panel-${panelId}`) {
          panel.classList.add('active');
          console.log('激活面板:', panel.id);
        }
      });
    });
  });
  
  console.log('initSidebarUI() - 面板切换已设置');
  
  const sidebarSectionTitles = document.querySelectorAll('.sidebar-section-title');
  sidebarSectionTitles.forEach(title => {
    title.addEventListener('click', () => {
      title.classList.toggle('collapsed');
      const content = title.nextElementSibling;
      if (content && content.classList.contains('sidebar-section-content')) {
        content.classList.toggle('collapsed');
      }
    });
  });
  
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });
  });
  
  const menubarItems = document.querySelectorAll('.menubar > .menubar-item');
  const menubarDropdowns = document.querySelectorAll('.menubar-dropdown');
  
  menubarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const menu = item.dataset.menu;
      
      e.stopPropagation();
      
      if (menu) {
        const dropdown = item.querySelector('.menubar-dropdown');
        if (dropdown) {
          const isVisible = dropdown.style.display === 'block';
          menubarDropdowns.forEach(d => d.style.display = 'none');
          dropdown.style.display = isVisible ? 'none' : 'block';
        }
      }
    });
  });
  
  document.addEventListener('click', (e) => {
    menubarDropdowns.forEach(dropdown => dropdown.style.display = 'none');
  });
  
  menubarDropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  const menubarDropdownItems = document.querySelectorAll('.menubar-dropdown .menubar-item');
  menubarDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action) {
        menubarDropdowns.forEach(dropdown => dropdown.style.display = 'none');
        handleMenuAction(action);
      }
    });
  });
}

export function initZoomButtons() {
  const updateStatusBar = getUpdateStatusBar();
  const fitToDiagram = getFitToDiagram();
  
  if (homeBtn) {
    console.log('initZoomButtons() - homeBtn:', homeBtn);
    console.log('initZoomButtons() - Adding click listener to homeBtn');
    homeBtn.addEventListener('click', () => {
      console.log('homeBtn clicked');
      if (typeof fitToDiagram === "function") {
        fitToDiagram();
      }
    });
  }
  
  if (zoomInBtn) {
    console.log('initZoomButtons() - zoomInBtn:', zoomInBtn);
    console.log('initZoomButtons() - Adding click listener to zoomInBtn');
    zoomInBtn.addEventListener('click', () => {
      console.log('zoomInBtn clicked, current zoomScale:', getZoomScale());
      let newZoomScale = getZoomScale() * 1.1;
      newZoomScale = Math.max(0.1, Math.min(3, newZoomScale));
      const viewBox = getViewBox();
      const center = { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
      const { w, h } = getViewportSize();
      const newW = w / newZoomScale;
      const newH = h / newZoomScale;
      setZoomScale(newZoomScale);
      setViewBox({ x: center.x - newW / 2, y: center.y - newH / 2, w: newW, h: newH });
      if (updateStatusBar) updateStatusBar(null, null, newZoomScale);
      console.log('zoomInBtn - new zoomScale:', newZoomScale);
    });
  }
  
  if (zoomOutBtn) {
    console.log('initZoomButtons() - zoomOutBtn:', zoomOutBtn);
    console.log('initZoomButtons() - Adding click listener to zoomOutBtn');
    zoomOutBtn.addEventListener('click', () => {
      console.log('zoomOutBtn clicked, current zoomScale:', getZoomScale());
      let newZoomScale = getZoomScale() / 1.1;
      newZoomScale = Math.max(0.1, Math.min(3, newZoomScale));
      const viewBox = getViewBox();
      const center = { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
      const { w, h } = getViewportSize();
      const newW = w / newZoomScale;
      const newH = h / newZoomScale;
      setZoomScale(newZoomScale);
      setViewBox({ x: center.x - newW / 2, y: center.y - newH / 2, w: newW, h: newH });
      if (updateStatusBar) updateStatusBar(null, null, newZoomScale);
      console.log('zoomOutBtn - new zoomScale:', newZoomScale);
    });
  }
}

export function initWindowControls() {
  const minimizeBtn = document.getElementById('minimizeBtn');
  const maximizeBtn = document.getElementById('maximizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  
  if (window.electron) {
    console.log('Window control buttons:', { minimizeBtn, maximizeBtn, closeBtn });
    console.log('Electron API:', window.electron);
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        console.log('Minimize button clicked');
        e.preventDefault();
        e.stopPropagation();
        window.electron.minimizeWindow();
      });
    }
    
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', (e) => {
        console.log('Maximize button clicked');
        e.preventDefault();
        e.stopPropagation();
        window.electron.maximizeWindow();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        window.electron.closeWindow();
      });
    }
  } else {
    console.log('Electron API not available, using browser fallback');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', (e) => {
        console.log('Minimize button clicked (browser)');
        e.preventDefault();
        e.stopPropagation();
        document.body.style.display = 'none';
        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = 'Restore';
        restoreBtn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:9999;padding:10px 20px;background:#007acc;color:white;border:none;border-radius:4px;cursor:pointer;';
        restoreBtn.onclick = () => {
          document.body.style.display = 'flex';
          restoreBtn.remove();
        };
        document.body.appendChild(restoreBtn);
      });
    }
    
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', (e) => {
        console.log('Maximize button clicked (browser)');
        e.preventDefault();
        e.stopPropagation();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen error:', err);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        console.log('Close button clicked (browser)');
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Are you sure you want to close Vibesim?')) {
          window.close();
        }
      });
    }
  }
}

export function initModals() {
  const aboutModal = document.getElementById('aboutModal');
  const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');
  const closeAboutModal = document.getElementById('closeAboutModal');
  
  if (aboutModal && closeAboutModalBtn) {
    closeAboutModalBtn.addEventListener('click', () => {
      aboutModal.classList.remove('show');
    });
  }
  
  if (aboutModal && closeAboutModal) {
    closeAboutModal.addEventListener('click', () => {
      aboutModal.classList.remove('show');
    });
  }
  
  if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.classList.remove('show');
      }
    });
  }
  
  const subsystemNameModal = document.getElementById('subsystemNameModal');
  const closeSubsystemNameModalBtn = document.getElementById('closeSubsystemNameModal');
  const cancelSubsystemNameBtn = document.getElementById('cancelSubsystemName');
  const confirmSubsystemNameBtn = document.getElementById('confirmSubsystemName');
  
  if (subsystemNameModal && closeSubsystemNameModalBtn) {
    closeSubsystemNameModalBtn.addEventListener('click', () => {
      subsystemNameModal.classList.remove('show');
    });
  }
  
  if (subsystemNameModal && cancelSubsystemNameBtn) {
    cancelSubsystemNameBtn.addEventListener('click', () => {
      subsystemNameModal.classList.remove('show');
    });
  }
  
  if (subsystemNameModal && confirmSubsystemNameBtn) {
    confirmSubsystemNameBtn.addEventListener('click', () => {
      subsystemNameModal.classList.remove('show');
    });
  }
  
  if (subsystemNameModal) {
    subsystemNameModal.addEventListener('click', (e) => {
      if (e.target === subsystemNameModal) {
        subsystemNameModal.classList.remove('show');
      }
    });
  }
  
  const subsystemNameInput = document.getElementById('subsystemNameInput');
  if (subsystemNameInput) {
    subsystemNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        subsystemNameModal.classList.remove('show');
      }
    });
  }
}
