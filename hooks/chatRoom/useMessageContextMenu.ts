import { useState, useCallback } from 'react';
import { Clipboard, Alert } from 'react-native';

export const useMessageContextMenu = (
    handleDeleteMessage: (id: string, forEveryone: boolean) => void,
    handleTranslate: (msg: any) => void,
    handleListen: (msg: any) => void
) => {
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [anchorY, setAnchorY] = useState(0);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardText, setForwardText] = useState('');
    const [infoVisible, setInfoVisible] = useState(false);

    const handleMessageLongPress = useCallback((msg: any, y: number) => {
        setSelectedMessage(msg);
        setAnchorY(y);
        setContextMenuVisible(true);
    }, []);

    const handleMessageAction = (action: string) => {
        if (!selectedMessage) return;
        switch (action) {
            case 'reply': setReplyingTo(selectedMessage); setEditingMessage(null); break;
            case 'copy': Clipboard.setString(selectedMessage.message || ''); break;
            case 'forward': setForwardText(selectedMessage.message || ''); setForwardModalVisible(true); break;
            case 'info': setInfoVisible(true); break;
            case 'edit': setEditingMessage(selectedMessage); setReplyingTo(null); break;
            case 'translate': handleTranslate(selectedMessage); break;
            case 'listen': handleListen(selectedMessage); break;
            case 'delete': 
                Alert.alert("Delete Message", "Choose how you want to delete this message.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete for Me", onPress: () => handleDeleteMessage(selectedMessage.id, false) },
                    { text: "Delete for Everyone", style: "destructive", onPress: () => handleDeleteMessage(selectedMessage.id, true) }
                ]); 
                break;
        }
    };

    return {
        contextMenuVisible, setContextMenuVisible,
        selectedMessage, setSelectedMessage,
        anchorY,
        replyingTo, setReplyingTo,
        editingMessage, setEditingMessage,
        forwardModalVisible, setForwardModalVisible,
        forwardText,
        infoVisible, setInfoVisible,
        handleMessageLongPress,
        handleMessageAction
    };
};
