import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const requestLocationPermission = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    let { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    if (status !== 'granted') {
      setErrorMsg('Разрешение на доступ к местоположению отклонено.');
      Alert.alert(
        'Требуется разрешение',
        'Для использования геолокации необходимо предоставить доступ к местоположению. Вы можете изменить это в настройках приложения.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'В настройки', onPress: () => Linking.openSettings() }
        ]
      );
      setIsLoading(false);
      return false;
    }
    setIsLoading(false);
    return true;
  };

  const getCurrentLocation = async (forceRequestPermission = false) => {
    let currentPermissionStatus = permissionStatus;
    if (forceRequestPermission || currentPermissionStatus !== 'granted') {
      const permissionGranted = await requestLocationPermission();
      if (!permissionGranted) {
        setIsLoading(false);
        return false;
      }
      currentPermissionStatus = 'granted'; 
    }
    
    if (currentPermissionStatus === 'granted') {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        let locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(locationData.coords);
        setIsLoading(false);
        return true;
      } catch (error) {
        setErrorMsg('Не удалось определить местоположение. Убедитесь, что GPS включен.');
        setLocation(null);
        let { status: newStatus } = await Location.getForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
            setPermissionStatus(newStatus);
        }
        setIsLoading(false);
        return false;
      }
    }
    setIsLoading(false);
    return false;
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      let { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
      } else {
      }
      setIsLoading(false);
    })();
  }, []);

  return { 
    location,
    errorMsg,
    isLoading,
    permissionStatus,
    requestLocationPermission,
    getCurrentLocation,
  };
};

export default useLocation;
