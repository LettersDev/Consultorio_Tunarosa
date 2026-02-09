import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Text, Searchbar, Avatar, List, Divider, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase.config';
import { COLORS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const DoctorPatientsScreen = ({ navigation }) => {
    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [filteredPatients, setFilteredPatients] = useState([]);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            // Get current doctor's ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get unique patient IDs from appointments with this doctor
            const { data: appointments, error: appError } = await supabase
                .from('appointments')
                .select('patient_id')
                .eq('doctor_id', user.id);

            if (appError) throw appError;

            // Get unique patient IDs
            const patientIds = [...new Set(appointments.map(a => a.patient_id))];

            if (patientIds.length === 0) {
                setPatients([]);
                setFilteredPatients([]);
                return;
            }

            // Fetch patient details
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .in('id', patientIds)
                .order('name');

            if (error) throw error;
            setPatients(data || []);
            setFilteredPatients(data || []);
        } catch (error) {
            console.error('Error fetching patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const onChangeSearch = query => {
        setSearchQuery(query);
        const filtered = patients.filter(patient =>
            (patient.name || '').toLowerCase().includes(query.toLowerCase()) ||
            (patient.email || '').toLowerCase().includes(query.toLowerCase())
        );
        setFilteredPatients(filtered);
    };

    const renderPatientItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}
        >
            <List.Item
                title={item.name}
                description={item.email}
                left={props => (
                    <Avatar.Text
                        {...props}
                        size={45}
                        label={(item.name || 'U').split(' ').map(n => n[0]).join('')}
                        backgroundColor={COLORS.secondary}
                    />
                )}
                right={props => <Ionicons {...props} name="chevron-forward" size={24} color={COLORS.textSecondary} />}
                style={styles.listItem}
            />
            <Divider />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mis Pacientes</Text>
                </View>
                <Searchbar
                    placeholder="Buscar paciente..."
                    onChangeText={onChangeSearch}
                    value={searchQuery}
                    style={styles.searchBar}
                    inputStyle={styles.searchInput}
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator animating={true} size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredPatients}
                    renderItem={renderPatientItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No se encontraron pacientes.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    backButton: {
        marginRight: 10,
    },
    searchBar: {
        elevation: 0,
        backgroundColor: COLORS.background,
        borderRadius: 10,
    },
    searchInput: {
        fontSize: 16,
    },
    listContent: {
        backgroundColor: COLORS.white,
    },
    listItem: {
        paddingVertical: 10,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
});
