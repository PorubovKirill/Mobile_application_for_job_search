import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetInfoContext = createContext({
  isConnected: true,
  connectionType: null,
});

export const NetInfoProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const internetActuallyReachable = state.isInternetReachable === null ? state.isConnected : state.isInternetReachable;
      setIsConnected(state.isConnected && internetActuallyReachable);
      setConnectionType(state.type);
    });

    NetInfo.fetch().then(state => {
      const internetActuallyReachable = state.isInternetReachable === null ? state.isConnected : state.isInternetReachable;
      setIsConnected(state.isConnected && internetActuallyReachable);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetInfoContext.Provider value={{ isConnected, connectionType }}>
      {children}
    </NetInfoContext.Provider>
  );
};

export const useNetInfo = () => useContext(NetInfoContext);
