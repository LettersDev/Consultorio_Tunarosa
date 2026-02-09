import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

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

import { authService } from './src/services/authService';
import { COLORS } from './src/constants';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('Auth_Login');
  const [screenParams, setScreenParams] = useState({});

  useEffect(() => {
    console.log('App: Initializing auth check...');
    let isMounted = true;
    let lastUserId = null;

    checkUser();

    let authSubscription = null;

    try {
      if (authService && typeof authService.onAuthStateChange === 'function') {
        const { data } = authService.onAuthStateChange(async (event, session) => {
          console.log('App: Auth state change event:', event);

          // Skip if component unmounted or if it's the same user to prevent flickering
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
            }
          } else {
            setUser(null);
            setCurrentScreen('Auth_Login');
            setLoading(false);
          }
        });
        authSubscription = data?.subscription;
      } else {
        console.warn('App: authService.onAuthStateChange is not available');
      }
    } catch (err) {
      console.error('App: Error setting up auth listener:', err);
    }

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const result = await authService.getSession();
      if (result?.data?.session?.user) {
        const { data: profile } = await authService.getUserProfile(result.data.session.user.id);
        setUser(profile);
        setCurrentScreen('Dashboard');
      } else {
        setCurrentScreen('Auth_Login');
      }
    } catch (error) {
      console.error('Auth error:', error);
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
            <Text style={{ marginTop: 20, color: COLORS.primary }}>Iniciando aplicación...</Text>
            <Text style={{ marginTop: 10, fontSize: 10, color: '#ccc' }}>v1.0.1-diagnostic</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  // --- Manual Router Logic ---
  const goBack = () => navigate('Dashboard');

  const renderScreen = () => {
    const nav = { navigate, goBack, logout };

    // 1. Auth Flow
    if (currentScreen === 'Auth_Login') {
      return <LoginScreen navigation={{ ...nav, navigate: (s) => navigate(s === 'Register' ? 'Auth_Register' : s) }} />;
    }
    if (currentScreen === 'Auth_Register') {
      return <RegisterScreen navigation={{ ...nav, navigate: (s) => navigate(s === 'Login' ? 'Auth_Login' : s) }} />;
    }

    // 2. Dashboards (Role-based)
    if (currentScreen === 'Dashboard') {
      if (user?.role === 'patient') return <PatientDashboard navigation={nav} />;
      if (user?.role === 'doctor') return <DoctorDashboard navigation={nav} />;
      if (user?.role === 'secretary') return <SecretaryDashboard navigation={nav} />;
      if (user?.role === 'admin') return <AdminDashboard navigation={nav} />;
      return <LoginScreen navigation={{ ...nav, navigate: (s) => navigate('Auth_Register') }} />;
    }

    // 3. Sub-screens
    // Patient
    if (currentScreen === 'PatientAppointments') return <PatientAppointmentsScreen navigation={nav} />;
    if (currentScreen === 'PatientProfile') return <PatientProfileScreen navigation={nav} />;
    if (currentScreen === 'BookAppointment') return <BookAppointmentScreen navigation={nav} />;
    if (currentScreen === 'Notifications') return <NotificationsScreen navigation={nav} />;

    // Doctor
    if (currentScreen === 'DoctorPatients') return <DoctorPatientsScreen navigation={nav} />;
    if (currentScreen === 'DoctorSchedule') return <DoctorScheduleScreen navigation={nav} />;
    if (currentScreen === 'PatientDetail') return <PatientDetailScreen navigation={nav} route={{ params: screenParams }} />;
    if (currentScreen === 'AddTreatment') return <AddTreatmentScreen navigation={nav} route={{ params: screenParams }} />;
    if (currentScreen === 'AddPrescription') return <AddPrescriptionScreen navigation={nav} route={{ params: screenParams }} />;

    // Secretary
    if (currentScreen === 'ManageAvailability') return <ManageAvailabilityScreen navigation={nav} />;
    if (currentScreen === 'AppointmentsOverview') return <AppointmentsOverviewScreen navigation={nav} />;

    return <View />;
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="auto" />
        <View style={{ flex: 1 }}>
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
