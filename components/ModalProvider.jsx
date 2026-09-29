"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, HelpCircle, Info } from "lucide-react";

// Création du contexte
const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    type: "alert", // 'alert', 'confirm', 'prompt'
    title: "",
    message: "",
    inputValue: "",
    resolvePromise: null,
  });

  // Fonction magique qui remplace alert(), confirm(), prompt()
  const showModal = useCallback(({ type = "alert", title, message, defaultValue = "" }) => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        type,
        title,
        message,
        inputValue: defaultValue,
        resolvePromise: resolve,
      });
    });
  }, []);

  const closeAndResolve = (result) => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (modal.resolvePromise) {
      modal.resolvePromise(result);
    }
  };

  const handleConfirm = () => {
    if (modal.type === "prompt") closeAndResolve(modal.inputValue);
    else closeAndResolve(true);
  };

  const handleCancel = () => {
    if (modal.type === "prompt") closeAndResolve(null);
    else closeAndResolve(false);
  };

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}

      {/* Le rendu du Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0b1121]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 md:p-8 flex flex-col items-center text-center">
              
              {/* Icône dynamique selon le type */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                modal.type === 'confirm' ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' :
                modal.type === 'alert' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
                'bg-blue-50 text-[#4931F7] dark:bg-[#4931F7]/10'
              }`}>
                {modal.type === 'confirm' ? <HelpCircle size={32} /> : 
                 modal.type === 'alert' ? <AlertCircle size={32} /> : 
                 <Info size={32} />}
              </div>

              <h3 className="text-xl font-black text-[#001F3F] dark:text-white mb-2">{modal.title}</h3>
              {modal.message && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{modal.message}</p>}

              {/* Champ input si c'est un prompt */}
              {modal.type === "prompt" && (
                <input
                  type="text"
                  autoFocus
                  value={modal.inputValue}
                  onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="w-full bg-slate-50 dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm font-medium focus:border-[#4931F7] outline-none dark:text-white mb-6 text-center"
                  placeholder="Écrivez ici..."
                />
              )}

              {/* Boutons d'action */}
              <div className="flex gap-3 w-full mt-2">
                {(modal.type === "confirm" || modal.type === "prompt") && (
                  <button 
                    onClick={handleCancel}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-slate-600 rounded-xl font-bold text-sm transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button 
                  onClick={handleConfirm}
                  className="flex-1 py-3.5 bg-[#4931F7] hover:bg-[#3b26c6] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4931F7]/30 transition-colors"
                >
                  {modal.type === "alert" ? "Compris" : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

// Hook personnalisé pour l'utiliser partout
export const useCustomModal = () => useContext(ModalContext);