import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Blindaje contra traductores de navegadores (Google Translate / Edge Translate)
// y extensiones que manipulan nodos del DOM y provocan 'NotFoundError: Failed to execute removeChild on Node'
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console && typeof console.warn === 'function') {
        console.warn('Protección DOM: Se evitó removeChild en un nodo modificado por traductor o extensión externa.', this, child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console && typeof console.warn === 'function') {
        console.warn('Protección DOM: Se evitó insertBefore en un nodo modificado por traductor o extensión externa.', this, referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
