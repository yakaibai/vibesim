const ERROR_LOG_KEY = 'vibesim_error_log';
const MAX_LOG_ENTRIES = 100;

export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack || '';
  const filename = error?.filename ? error.filename.split('/').pop() : '';
  const lineno = error?.lineno || '';
  const colno = error?.colno || '';
  
  const logEntry = {
    timestamp,
    context: context || 'Unknown',
    error: errorMessage,
    filename,
    lineno,
    colno,
    stack: errorStack
  };
  
  try {
    const existingLogs = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    existingLogs.push(logEntry);
    
    if (existingLogs.length > MAX_LOG_ENTRIES) {
      existingLogs.shift();
    }
    
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(existingLogs));
    console.error('Error logged to localStorage:', logEntry);
  } catch (err) {
    console.error('Failed to write error log:', err);
  }
}

export function clearErrorLog() {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
    console.log('Error log cleared');
  } catch (err) {
    console.error('Failed to clear error log:', err);
  }
}

export function getErrorLog() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
  } catch (err) {
    console.error('Failed to read error log:', err);
    return [];
  }
}

export function getLatestErrors(count = 10) {
  try {
    const logs = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    return logs.slice(-count).reverse();
  } catch (err) {
    console.error('Failed to read error log:', err);
    return [];
  }
}

export function exportErrorLog() {
  try {
    const logs = getErrorLog();
    const logText = logs.map(entry => {
      return [
        `[${entry.timestamp}]`,
        `Context: ${entry.context}`,
        `Error: ${entry.error}`,
        entry.filename ? `File: ${entry.filename}${entry.lineno ? `:${entry.lineno}` : ''}${entry.colno ? `:${entry.colno}` : ''}` : '',
        entry.stack ? `Stack:\n${entry.stack}` : '',
        '---'
      ].filter(Boolean).join('\n');
    }).join('\n\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Error log exported');
  } catch (err) {
    console.error('Failed to export error log:', err);
  }
}

export function setupGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), 'Global Error Handler');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, 'Unhandled Promise Rejection');
  });
}

export function showErrorLogInConsole() {
  const logs = getLatestErrors();
  console.group('🔍 Latest Errors');
  logs.forEach((entry, index) => {
    console.group(`Error ${index + 1}: ${entry.error}`);
    console.log('Timestamp:', entry.timestamp);
    console.log('Context:', entry.context);
    if (entry.filename) {
      console.log('Location:', `${entry.filename}:${entry.lineno}:${entry.colno}`);
    }
    if (entry.stack) {
      console.log('Stack:', entry.stack);
    }
    console.groupEnd();
  });
  console.groupEnd();
}

export function createErrorLogButton() {
  const button = document.createElement('button');
  button.textContent = '📋 Copy Error Log';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 10px 15px;
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  
  button.addEventListener('click', () => {
    const logs = getLatestErrors(1);
    if (logs.length > 0) {
      const entry = logs[0];
      const errorText = `${entry.error}\n${entry.filename ? `File: ${entry.filename}:${entry.lineno}:${entry.colno}` : ''}`;
      navigator.clipboard.writeText(errorText).then(() => {
        button.textContent = '✅ Copied!';
        setTimeout(() => {
          button.textContent = '📋 Copy Error Log';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    } else {
      button.textContent = '❌ No Errors';
      setTimeout(() => {
        button.textContent = '📋 Copy Error Log';
      }, 2000);
    }
  });
  
  document.body.appendChild(button);
  return button;
}
