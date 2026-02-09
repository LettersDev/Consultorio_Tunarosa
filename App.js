import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

// Auth Screens
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';

// Dashboards
import { PatientDashboard } from './src/screens/patient/PatientDashboard';
import { DoctorDashboard } from './src/screens/doctor/DoctorDashboard';
import { SecretaryDashboard } from './src/screens/secretary/SecretaryDashboard';
import { AdminDashboard } from './src/screens/admin/AdminDashboard';

// Shared / Detail Screens
import { PatientAppointmentsScreen } from './src/screens/patient/PatientAppointmentsScreen';
import { PatientProfileScreen } from './src/screens/patient/PatientProfileScreen';
import { BookAppointmentScreen } from './src/screens/patient/BookAppointmentScreen';
import { NotificationsScreen } from './src/screens/patient/NotificationsScreen';
import { DoctorPatientsScreen } from './src/screens/doctor/DoctorPatientsScreen';
import { DoctorScheduleScreen } from './src/screens/doctor/DoctorScheduleScreen';
import { PatientDetailScreen } from './src/screens/doctor/PatientDetailScreen';
import { AddTreatmentScreen } from './src/screens/doctor/AddTreatmentScreen';
import { AddPrescriptionScreen } from './src/screens/doctor/AddPrescriptionScreen';
import { ManageAvailabilityScreen } from './src/screens/secretary/ManageAvailabilityScreen';
import { AppointmentsOverviewScreen } from './src/screens/secretary/AppointmentsOverviewScreen';
import { BroadcastScreen } from './src/screens/shared/BroadcastScreen';

import { authService } from './src/services/authService';
import { notificationService } from './src/services/notificationService';
import { COLORS } from './src/constants';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('Auth_Login');
  const [screenParams, setScreenParams] = useState({});
  const [initError, setInitError] = useState(null);

  useEffect(() => {

    let isMounted = true;
    let lastUserId = null;

    const checkUpdates = async () => {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (err) {
        console.log('Update check failed:', err);
      }
    };

    const setupAuth = async () => {
      try {
        await checkUser();

        // Configurar escuchas de notificaciones interactivas
        const notificationSubscription = notificationService.initNotificationHandlers();

        let authSubscription = null;

        if (authService && typeof authService.onAuthStateChange === 'function') {
          const { data } = authService.onAuthStateChange(async (event, session) => {
            console.log('App: Auth state change event:', event);

            if (!isMounted) return;

            const newUserId = session?.user?.id || null;
            if (newUserId === lastUserId && event !== 'SIGNED_OUT') return;
            lastUserId = newUserId;

            if (session?.user) {
              const { data: profile } = await authService.getUserProfile(session.user.id);
              if (isMounted) {
                setUser(profile);
                setCurrentScreen('Dashboard');
                setLoading(false);
                // Registrar para notificaciones push una vez tenemos el perfil (NON-BLOCKING)
                notificationService.registerForPushNotifications(session.user.id)
                  .then(token => {
                    if (isMounted && token) {
                      setUser(prev => prev ? { ...prev, push_token: token } : profile);
                    }
                  })
                  .catch(err => {
                    console.log('App: Push registration failed silently:', err.message);
                  });
              }
            } else {
              setUser(null);
              setCurrentScreen('Auth_Login');
              setLoading(false);
            }
          });
          authSubscription = data?.subscription;
        }

        return () => {
          isMounted = false;
          if (authSubscription) authSubscription.unsubscribe();
          if (notificationSubscription) notificationSubscription.remove();
        };
      } catch (err) {
        console.error('App: Fatal init error:', err);
        setInitError(err.message || 'Error desconocido al iniciar');
        setLoading(false);
      }
    };

    setupAuth();
    checkUpdates();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await authService.getSession();
      const sessionUser = sessionData?.session?.user;

      if (sessionUser) {
        const { data: profile } = await authService.getUserProfile(sessionUser.id);
        if (profile) {
          setUser(profile);
          setCurrentScreen('Dashboard');
          // Registrar para notificaciones push (NON-BLOCKING)
          notificationService.registerForPushNotifications(sessionUser.id)
            .then(token => {
              if (token) {
                setUser(prev => prev ? { ...prev, push_token: token } : profile);
              }
            })
            .catch(err => {
              console.log('App: Push registration failed silently:', err.message);
            });
        } else {
          setCurrentScreen('Auth_Login');
        }
      } else {
        setCurrentScreen('Auth_Login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      throw error; // Let the useEffect catch it
    } finally {
      setLoading(false);
    }
  };

  const navigate = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  const logout = async () => {
    await authService.signOut();
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 20, color: COLORS.primary, fontWeight: '700' }}>Iniciando aplicación...</Text>
            <Text style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>v1.2.1 - Firebase Stable</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  // --- Manual Router Logic ---
  const goBack = () => navigate('Dashboard');

  const renderScreen = () => {
    const registerPush = () => {
      if (user?.id) {
        notificationService.registerForPushNotifications(user.id).then(token => {
          if (token) {
            setUser(prev => prev ? { ...prev, push_token: token } : null);
          }
        });
      }
    };

    const nav = { navigate, goBack, logout };
    const commonProps = { navigation: nav, user, registerPush };

    // 1. Auth Flow
    if (currentScreen === 'Auth_Login') {
      return <LoginScreen navigation={{ ...nav, navigate: (s) => navigate(s === 'Register' ? 'Auth_Register' : s) }} />;
    }
    if (currentScreen === 'Auth_Register') {
      return <RegisterScreen navigation={{ ...nav, navigate: (s) => navigate(s === 'Login' ? 'Auth_Login' : s) }} />;
    }

    // 2. Dashboards (Role-based)
    if (currentScreen === 'Dashboard') {
      if (user?.role === 'patient') return <PatientDashboard {...commonProps} />;
      if (user?.role === 'doctor') return <DoctorDashboard {...commonProps} />;
      if (user?.role === 'secretary') return <SecretaryDashboard {...commonProps} />;
      if (user?.role === 'admin') return <AdminDashboard {...commonProps} />;
      return <LoginScreen navigation={{ ...nav, navigate: (s) => navigate('Auth_Register') }} />;
    }

    // 3. Sub-screens
    // Patient
    if (currentScreen === 'PatientAppointments') return <PatientAppointmentsScreen {...commonProps} />;
    if (currentScreen === 'PatientProfile') return <PatientProfileScreen {...commonProps} />;
    if (currentScreen === 'BookAppointment') return <BookAppointmentScreen {...commonProps} />;
    if (currentScreen === 'Notifications') return <NotificationsScreen {...commonProps} />;

    // Doctor
    if (currentScreen === 'DoctorPatients') return <DoctorPatientsScreen {...commonProps} />;
    if (currentScreen === 'DoctorSchedule') return <DoctorScheduleScreen {...commonProps} />;
    if (currentScreen === 'PatientDetail') return <PatientDetailScreen {...commonProps} route={{ params: screenParams }} />;
    if (currentScreen === 'AddTreatment') return <AddTreatmentScreen {...commonProps} route={{ params: screenParams }} />;
    if (currentScreen === 'AddPrescription') return <AddPrescriptionScreen {...commonProps} route={{ params: screenParams }} />;

    // Secretary
    if (currentScreen === 'ManageAvailability') return <ManageAvailabilityScreen {...commonProps} />;
    if (currentScreen === 'AppointmentsOverview') return <AppointmentsOverviewScreen {...commonProps} />;
    if (currentScreen === 'Shared_Broadcast') return <BroadcastScreen {...commonProps} />;

    return <View />;
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="auto" />
        <View style={{ flex: 1 }}>
          {initError && (
            <View style={{ backgroundColor: '#fee', padding: 10, borderBottomWidth: 1, borderBottomColor: '#fcc' }}>
              <Text style={{ color: '#c00', fontSize: 12, textAlign: 'center' }}>⚠️ ERROR DE INICIO: {initError}</Text>
            </View>
          )}
          {renderScreen()}
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
