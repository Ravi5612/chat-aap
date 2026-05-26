import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import * as Haptics from 'expo-haptics';

export const useChangePassword = () => {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    // Normal flow fields
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP flow
    const [step, setStep] = useState(1); // 1: Normal, 2: OTP, 3: Reset after OTP
    const [otp, setOtp] = useState('');

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });
            if (signInError) throw new Error("Current password is incorrect");

            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Password updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("OTP Sent", `A 6-digit reset code has been sent to ${user.email}`);
            setStep(2);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to send reset code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Alert.alert("Error", "Please enter the 6-digit code");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: user.email,
                token: otp,
                type: 'recovery'
            });
            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep(3);
        } catch (error: any) {
            Alert.alert("Error", "Invalid or expired code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Password reset successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return {
        loading, step, setStep,
        otp, setOtp,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        handleChangePassword,
        handleForgotPassword,
        handleVerifyOtp,
        handleResetPassword,
    };
};
