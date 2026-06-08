import { useState, useCallback } from 'react';

export const useChatModals = () => {
    const [emojiModalVisible, setEmojiModalVisible] = useState(false);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [cameraModalVisible, setCameraModalVisible] = useState(false);
    const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

    const openCamera = useCallback(() => setCameraModalVisible(true), []);
    const openContacts = useCallback(() => setContactModalVisible(true), []);
    const openSchedule = useCallback(() => setScheduleModalVisible(true), []);
    const closeCamera = useCallback(() => setCameraModalVisible(false), []);
    const closeContacts = useCallback(() => setContactModalVisible(false), []);
    const closeSchedule = useCallback(() => setScheduleModalVisible(false), []);

    return {
        emojiModalVisible, setEmojiModalVisible,
        contactModalVisible, setContactModalVisible,
        cameraModalVisible, setCameraModalVisible,
        scheduleModalVisible, setScheduleModalVisible,
        openCamera, openContacts, openSchedule,
        closeCamera, closeContacts, closeSchedule
    };
};
