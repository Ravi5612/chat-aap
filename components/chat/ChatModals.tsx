import React from 'react';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import ForwardMessageModal from '@/components/chat/ForwardMessageModal';
import MediaViewer from '@/components/chat/MediaViewer';
import CallScreen from '@/components/chat/CallScreen';
import LedgerModal from '@/components/chat/LedgerModal';

interface ChatModalsProps {
    contextMenuVisible: boolean;
    setContextMenuVisible: (v: boolean) => void;
    selectedMessage: any;
    anchorY: number;
    currentUser: any;
    handleReact: (msgId: string, emoji: string) => void;
    handleMessageAction: (action: string) => void;
    
    forwardModalVisible: boolean;
    setForwardModalVisible: (v: boolean) => void;
    handleForwardSubmit: (friendIds: string[]) => void;
    
    viewerVisible: boolean;
    setViewerVisible: (v: boolean) => void;
    viewerImage: string | null;
    
    ledgerVisible: boolean;
    setLedgerVisible: (v: boolean) => void;
    safeFriendId: string;
    friendName: string;
}

export default function ChatModals({
    contextMenuVisible, setContextMenuVisible, selectedMessage, anchorY, currentUser, handleReact, handleMessageAction,
    forwardModalVisible, setForwardModalVisible, handleForwardSubmit,
    viewerVisible, setViewerVisible, viewerImage,
    ledgerVisible, setLedgerVisible, safeFriendId, friendName
}: ChatModalsProps) {
    return (
        <>
            <MessageContextMenu
                visible={contextMenuVisible}
                onClose={() => setContextMenuVisible(false)}
                onSelectReaction={(emoji) => selectedMessage && handleReact(selectedMessage.id, emoji)}
                onAction={handleMessageAction}
                anchorY={anchorY}
                isCurrentUser={selectedMessage?.sender_id === currentUser?.id}
                canEdit={selectedMessage?.sender_id === currentUser?.id}
            />

            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={() => setForwardModalVisible(false)}
                onForward={handleForwardSubmit}
            />

            <MediaViewer
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                imageUrl={viewerImage || ''}
            />

            <CallScreen />

            <LedgerModal
                visible={ledgerVisible}
                onClose={() => setLedgerVisible(false)}
                friendId={safeFriendId}
                friendName={friendName}
                currentUser={currentUser}
            />
        </>
    );
}
