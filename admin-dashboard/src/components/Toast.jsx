import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icons3D';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`} key={toast.id}>
          <Icon name={toast.type === 'success' ? 'check' : 'x'} size={18} c1="#ffffff" c2="#dbeafe" />
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
