import { supabase } from '../../supabase.config';

export const authService = {
    // Sign up a new patient
    async signUp(email, password, userData) {
        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // Insert user data into users table
            const { error: userError } = await supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email: userData.email,
                        name: userData.name,
                        age: userData.age,
                        birth_date: userData.birthDate,
                        phone: userData.phone,
                        allergies: userData.allergies,
                        medications: userData.medications,
                        role: 'patient',
                    },
                ]);

            if (userError) throw userError;

            return { data: authData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Sign in
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Get user role and data
            const { data: userRecords, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .limit(1);

            if (userError) throw userError;
            const userData = userRecords && userRecords.length > 0 ? userRecords[0] : null;
            if (!userData) throw new Error('No se encontró el perfil del usuario.');

            return { data: { ...data, userData }, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Sign out
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    // Get current session
    async getSession() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (data.session) {
                // Get user data
                const { data: userRecords, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .limit(1);

                if (userError) throw userError;
                const userData = userRecords && userRecords.length > 0 ? userRecords[0] : null;

                return { data: { session: data.session, userData }, error: null };
            }

            return { data: null, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return { data: null, error: null };

            const { data: userRecords, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .limit(1);

            if (error) throw error;
            const userData = userRecords && userRecords.length > 0 ? userRecords[0] : null;

            return { data: userData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get user profile
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },
};
