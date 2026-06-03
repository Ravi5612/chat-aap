import React, { memo, useCallback, useMemo } from 'react';
import MessageContextMenu from '@/components/chat/MessageContextMenu';
import ForwardMessageModal from '@/components/chat/ForwardMessageModal';
import MediaViewer from '@/components/chat/MediaViewer';
import CallScreen from '@/components/chat/CallScreen';
import LedgerModal from '@/components/chat/LedgerModal';
import MessageInfoModal from '@/components/chat/MessageInfoModal';

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
    viewerIsVideo?: boolean;

    ledgerVisible: boolean;
    setLedgerVisible: (v: boolean) => void;
    safeFriendId: string;
    friendName: string;

    infoVisible: boolean;
    setInfoVisible: (v: boolean) => void;
    allowDownload?: boolean;
}

const ChatModals = memo(({
    contextMenuVisible, setContextMenuVisible, selectedMessage, anchorY, currentUser, handleReact, handleMessageAction,
    forwardModalVisible, setForwardModalVisible, handleForwardSubmit,
    viewerVisible, setViewerVisible, viewerImage, viewerIsVideo,
    ledgerVisible, setLedgerVisible, safeFriendId, friendName,
    infoVisible, setInfoVisible, allowDownload,
}: ChatModalsProps) => {

    // Stable close callbacks — prevent child re-renders when parent re-renders
    const closeContextMenu   = useCallback(() => setContextMenuVisible(false),  [setContextMenuVisible]);
    const closeForwardModal  = useCallback(() => setForwardModalVisible(false),  [setForwardModalVisible]);
    const closeViewer        = useCallback(() => setViewerVisible(false),        [setViewerVisible]);
    const closeLedger        = useCallback(() => setLedgerVisible(false),        [setLedgerVisible]);
    const closeInfo          = useCallback(() => setInfoVisible(false),          [setInfoVisible]);

    // Memoized reaction handler — selectedMessage changes only when user taps a message
    const handleSelectReaction = useCallback((emoji: string) => {
        if (selectedMessage) handleReact(selectedMessage.id, emoji);
    }, [selectedMessage, handleReact]);

    // Derived booleans — avoid re-computing on every render
    const isCurrentUser = useMemo(
        () => selectedMessage?.sender_id === currentUser?.id,
        [selectedMessage?.sender_id, currentUser?.id]
    );

    const viewerImageUri = useMemo(() => viewerImage || '', [viewerImage]);

    return (
        <>
            <MessageContextMenu
                visible={contextMenuVisible}
                onClose={closeContextMenu}
                onSelectReaction={handleSelectReaction}
                onAction={handleMessageAction}
                anchorY={anchorY}
                isCurrentUser={isCurrentUser}
                canEdit={isCurrentUser}
            />

            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={closeForwardModal}
                onForward={handleForwardSubmit}
            />

            <MediaViewer
                visible={viewerVisible}
                onClose={closeViewer}
                imageUri={viewerImageUri}
                isVideo={viewerIsVideo}
                allowDownload={allowDownload}
            />

            <CallScreen />

            <LedgerModal
                visible={ledgerVisible}
                onClose={closeLedger}
                friendId={safeFriendId}
                friendName={friendName}
                currentUser={currentUser}
            />

            <MessageInfoModal
                visible={infoVisible}
                onClose={closeInfo}
                message={selectedMessage}
            />
        </>
    );
});

export default ChatModals;

