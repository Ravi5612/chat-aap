export type DP_Privacy = 'everyone' | 'friends' | 'selected';

interface PrivacyProfile {
    id: string;
    avatar_url?: string | null;
    dp_privacy?: DP_Privacy | null;
    dp_selected_friends?: string[] | null;
    hide_dp_in_search?: boolean | null;
    username?: string | null;
    gender?: string | null;
}

/**
 * Determines if a viewer is allowed to see the target user's avatar.
 * @param targetProfile The profile of the user whose avatar we want to display.
 * @param viewerId The ID of the user viewing the avatar (usually current user).
 * @param isFriend Boolean indicating if the viewer and target are friends.
 * @param isSearchContext Boolean indicating if this check is happening in global search/suggestions.
 * @returns The avatar URL if visible, otherwise a default dicebear initials URL or null.
 */
export function getVisibleAvatar(
    targetProfile: PrivacyProfile | null,
    viewerId: string | undefined,
    isFriend: boolean = false,
    isSearchContext: boolean = false
): any {
    if (!targetProfile) return require('@/assets/images/default-avatar-male.jpg');

    let defaultAvatar;
    if (targetProfile.gender === 'female') {
        defaultAvatar = require('@/assets/images/default-avatar-female.jpg');
    } else if (targetProfile.gender === 'other') {
        defaultAvatar = require('@/assets/images/default-avatar-other.png');
    } else {
        defaultAvatar = require('@/assets/images/default-avatar-male.jpg');
    }

    const actualAvatar = targetProfile.avatar_url ? { uri: targetProfile.avatar_url } : defaultAvatar;

    // 1. If viewer is the owner, they can always see their own DP
    if (viewerId && targetProfile.id === viewerId) {
        return actualAvatar;
    }

    // 2. Extract privacy settings with defaults
    const privacySetting: DP_Privacy = targetProfile.dp_privacy || 'everyone';
    const hideInSearch = targetProfile.hide_dp_in_search || false;
    const allowedFriends = targetProfile.dp_selected_friends || [];

    // 3. Search Context override: if hide_in_search is true and they are not friends
    if (isSearchContext && hideInSearch && !isFriend) {
        return defaultAvatar;
    }

    // 4. Evaluate based on dp_privacy setting
    switch (privacySetting) {
        case 'everyone':
            return actualAvatar;
        case 'friends':
            return isFriend ? actualAvatar : defaultAvatar;
        case 'selected':
            if (!viewerId) return defaultAvatar;
            return allowedFriends.includes(viewerId) ? actualAvatar : defaultAvatar;
        default:
            return actualAvatar;
    }
}
