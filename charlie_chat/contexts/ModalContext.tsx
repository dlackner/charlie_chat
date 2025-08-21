"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  showSignUpModal: boolean;
  setShowSignUpModal: (show: boolean) => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <ModalContext.Provider value={{
      showSignUpModal,
      setShowSignUpModal,
      showLoginModal,
      setShowLoginModal,
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}