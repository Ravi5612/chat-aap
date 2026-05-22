import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallbackName?: string; // e.g. "Friend List Item"
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ComponentErrorBoundary caught an error in ${this.props.fallbackName || 'Component'}:`, error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={{ fontWeight: 'bold', color: '#991B1B', fontSize: 14 }}>
              Failed to load {this.props.fallbackName || 'item'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }} numberOfLines={2}>
            {this.state.error?.message}
          </Text>
          <TouchableOpacity 
            onPress={this.resetError}
            style={{ backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
