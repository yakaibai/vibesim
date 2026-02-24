// Grid manager module

let gridVisible = true;
let gridSize = 20;

const canvas = document.getElementById('svgCanvas')?.parentElement;
const gridToggleBtn = document.getElementById('gridToggleBtn');
const gridSettingsBtn = document.getElementById('gridSettingsBtn');
const gridSettingsModal = document.getElementById('gridSettingsModal');
const gridSizeInput = document.getElementById('gridSizeInput');
const gridSizeSlider = document.getElementById('gridSizeSlider');
const gridSettingsApplyBtn = document.getElementById('gridSettingsApplyBtn');
const gridSettingsCancelBtn = document.getElementById('gridSettingsCancelBtn');
const modalCloseBtn = gridSettingsModal?.querySelector('.modal-close');

// Load grid settings from localStorage
export function loadGridSettings() {
  const savedVisible = localStorage.getItem('gridVisible');
  const savedSize = localStorage.getItem('gridSize');
  
  if (savedVisible !== null) {
    gridVisible = savedVisible === 'true';
  }
  
  if (savedSize !== null) {
    gridSize = parseInt(savedSize, 10);
    if (isNaN(gridSize)) {
      gridSize = 20;
    }
  }
  
  updateGridVisibility();
  updateGridSize();
  updateUI();
}

// Save grid settings to localStorage
function saveGridSettings() {
  localStorage.setItem('gridVisible', gridVisible.toString());
  localStorage.setItem('gridSize', gridSize.toString());
}

// Update grid visibility
export function updateGridVisibility() {
  if (canvas) {
    if (gridVisible) {
      canvas.style.backgroundImage = `
        linear-gradient(to right, var(--canvas-grid-color) 1px, transparent 1px),
        linear-gradient(to bottom, var(--canvas-grid-color) 1px, transparent 1px)
      `;
    } else {
      canvas.style.backgroundImage = 'none';
    }
  }
}

// Update grid size
export function updateGridSize() {
  if (canvas) {
    canvas.style.setProperty('--grid-size', `${gridSize}px`);
  }
}

// Update UI elements
function updateUI() {
  if (gridToggleBtn) {
    if (gridVisible) {
      gridToggleBtn.classList.add('active');
    } else {
      gridToggleBtn.classList.remove('active');
    }
  }
  
  if (gridSizeInput) {
    gridSizeInput.value = gridSize;
  }
  
  if (gridSizeSlider) {
    gridSizeSlider.value = gridSize;
  }
}

// Toggle grid visibility
export function toggleGridVisibility() {
  gridVisible = !gridVisible;
  updateGridVisibility();
  updateUI();
  saveGridSettings();
}

// Set grid size
export function setGridSize(size) {
  const parsedSize = parseInt(size, 10);
  
  if (isNaN(parsedSize) || parsedSize < 5 || parsedSize > 100) {
    alert('Grid size must be between 5 and 100 pixels.');
    return false;
  }
  
  gridSize = parsedSize;
  updateGridSize();
  
  // Automatically enable grid visibility when setting grid size
  if (!gridVisible) {
    gridVisible = true;
    updateGridVisibility();
  }
  
  updateUI();
  saveGridSettings();
  return true;
}

// Show grid settings modal
function showGridSettingsModal() {
  if (gridSettingsModal) {
    gridSettingsModal.classList.add('show');
  }
}

// Hide grid settings modal
function hideGridSettingsModal() {
  if (gridSettingsModal) {
    gridSettingsModal.classList.remove('show');
  }
}

// Initialize grid manager
export function initGridManager() {
  // Load saved settings
  loadGridSettings();
  
  // Add event listeners
  if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', toggleGridVisibility);
  }
  
  if (gridSettingsBtn) {
    gridSettingsBtn.addEventListener('click', showGridSettingsModal);
  }
  
  if (gridSettingsCancelBtn) {
    gridSettingsCancelBtn.addEventListener('click', hideGridSettingsModal);
  }
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', hideGridSettingsModal);
  }
  
  if (gridSettingsApplyBtn) {
    gridSettingsApplyBtn.addEventListener('click', () => {
      const success = setGridSize(gridSizeInput.value);
      if (success) {
        hideGridSettingsModal();
      }
    });
  }
  
  if (gridSizeInput && gridSizeSlider) {
    gridSizeInput.addEventListener('input', (e) => {
      gridSizeSlider.value = e.target.value;
    });
    
    gridSizeSlider.addEventListener('input', (e) => {
      gridSizeInput.value = e.target.value;
    });
  }
  
  // Close modal when clicking outside
  if (gridSettingsModal) {
    gridSettingsModal.addEventListener('click', (e) => {
      if (e.target === gridSettingsModal) {
        hideGridSettingsModal();
      }
    });
  }
}

// Export grid state for other modules
export function getGridState() {
  return {
    visible: gridVisible,
    size: gridSize
  };
}

// Export grid size for other modules
export function getGridSize() {
  return gridSize;
}
