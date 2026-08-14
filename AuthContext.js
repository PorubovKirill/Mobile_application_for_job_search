import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const signIn = (userData) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
    return true;
  };
  return (
    <AuthContext.Provider value={{ user, setUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
