import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase.config';
import { authService } from '../../services/authService';
import { COLORS, ROLES } from '../../constants';
import { CustomButton } from '../../components/CustomButton';
import { CustomInput } from '../../components/CustomInput';

export const AdminDashboard = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('patients');
    const [addModal, setAddModal] = useState({ visible: false, role: '' });
    const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '' });
    const [addingUser, setAddingUser] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: userData } = await authService.getCurrentUser();
            setUser(userData);

            const { data: allUsers, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error) setUsers(allUsers || []);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleDeleteUser = (userId, userName) => {
        Alert.alert(
            'Eliminar Usuario',
            `¿Seguro que desea eliminar a "${userName}"? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await authService.deleteUser(userId);
                            if (error) throw error;
                            Alert.alert('Éxito', 'Usuario eliminado correctamente');
                            await loadData();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar el usuario');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            Alert.alert('Error', 'Nombre, email y contraseña son requeridos');
            return;
        }

        try {
            setAddingUser(true);
            const { error } = await authService.createStaffUser(
                newUser.email,
                newUser.password,
                {
                    email: newUser.email,
                    name: newUser.name,
                    phone: newUser.phone,
                    role: addModal.role,
                }
            );

            if (error) throw error;

            Alert.alert('Éxito', `${addModal.role === 'doctor' ? 'Doctor' : 'Secretaria'} agregado correctamente`);
            setAddModal({ visible: false, role: '' });
            setNewUser({ name: '', email: '', phone: '', password: '' });
            await loadData();
        } catch (error) {
            Alert.alert('Error', `No se pudo crear el usuario: ${error.message}`);
        } finally {
            setAddingUser(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Cerrar Sesión', '¿Está seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí', onPress: async () => await authService.signOut() },
        ]);
    };

    const filteredUsers = users.filter(u => {
        if (activeTab === 'patients') return u.role === 'patient';
        if (activeTab === 'doctors') return u.role === 'doctor';
        if (activeTab === 'secretaries') return u.role === 'secretary';
        return true;
    });

    if (loading && users.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Panel de Administración</Text>
                        <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabs}>
                    {['patients', 'doctors', 'secretaries'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'patients' ? 'Pacientes' : tab === 'doctors' ? 'Doctores' : 'Secretarias'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            >
                {(activeTab === 'doctors' || activeTab === 'secretaries') && (
                    <CustomButton
                        title={`Agregar ${activeTab === 'doctors' ? 'Doctor' : 'Secretaria'}`}
                        onPress={() => setAddModal({ visible: true, role: activeTab === 'doctors' ? 'doctor' : 'secretary' })}
                        icon="add-circle-outline"
                        style={styles.addButton}
                    />
                )}

                <View style={styles.userList}>
                    {filteredUsers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No hay usuarios</Text>
                        </View>
                    ) : (
                        filteredUsers.map(u => (
                            <View key={u.id} style={styles.userCard}>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName2}>{u.name}</Text>
                                    <Text style={styles.userEmail}>{u.email}</Text>
                                    {u.phone && <Text style={styles.userPhone}>{u.phone}</Text>}
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => handleDeleteUser(u.id, u.name)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Add User Modal */}
            <Modal
                visible={addModal.visible}
                transparent
                animationType="slide"
                onRequestClose={() => setAddModal({ visible: false, role: '' })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Agregar {addModal.role === 'doctor' ? 'Doctor' : 'Secretaria'}
                        </Text>

                        <CustomInput
                            label="Nombre Completo"
                            value={newUser.name}
                            onChangeText={(v) => setNewUser({ ...newUser, name: v })}
                            placeholder="Nombre del usuario"
                        />
                        <CustomInput
                            label="Correo Electrónico"
                            value={newUser.email}
                            onChangeText={(v) => setNewUser({ ...newUser, email: v })}
                            placeholder="correo@ejemplo.com"
                            keyboardType="email-address"
                        />
                        <CustomInput
                            label="Teléfono"
                            value={newUser.phone}
                            onChangeText={(v) => setNewUser({ ...newUser, phone: v })}
                            placeholder="4121234567"
                            keyboardType="phone-pad"
                            prefix="+58 "
                        />
                        <CustomInput
                            label="Contraseña"
                            value={newUser.password}
                            onChangeText={(v) => setNewUser({ ...newUser, password: v })}
                            placeholder="Mínimo 6 caracteres"
                            secureTextEntry
                        />

                        <View style={styles.modalActions}>
                            <CustomButton
                                title="Cancelar"
                                onPress={() => setAddModal({ visible: false, role: '' })}
                                variant="outline"
                                style={{ flex: 1, marginRight: 10 }}
                            />
                            <CustomButton
                                title="Agregar"
                                onPress={handleAddUser}
                                loading={addingUser}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.primary,
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.surface,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    addButton: {
        marginBottom: 15,
    },
    userList: {
        gap: 12,
    },
    userCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    userInfo: {
        flex: 1,
    },
    userName2: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    userPhone: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    deleteBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 15,
    },
});
