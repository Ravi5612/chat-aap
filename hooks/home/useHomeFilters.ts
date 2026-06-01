import { useMemo } from 'react';

export const useHomeFilters = (combinedItems: any[], activeTab: string, searchQuery: string, isVaultOpen: boolean) => {
    const filteredItems = useMemo(() => {
        return combinedItems.filter(item => {
            if (isVaultOpen) return item.isHidden;
            if (item.isHidden) return false;
            
            let tabMatch = true;
            if (activeTab === 'all') tabMatch = !item.isArchived && !item.isLocked;
            else if (activeTab === 'friends') tabMatch = !item.isGroup && !item.isArchived && !item.isLocked && !item.isUnfriended;
            else if (activeTab === 'groups') tabMatch = item.isGroup && !item.isArchived && !item.isLocked;
            else if (activeTab === 'favourites') tabMatch = item.isFavorite && !item.isArchived && !item.isLocked;
            else if (activeTab === 'archive') tabMatch = item.isArchived && !item.isLocked;
            else if (activeTab === 'locked') tabMatch = item.isLocked;

            const searchMatch = !searchQuery || (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return tabMatch && searchMatch;
        });
    }, [combinedItems, activeTab, searchQuery, isVaultOpen]);

    const tabCounts = useMemo(() => {
        const counts = { all: 0, friends: 0, groups: 0, favourites: 0, archive: 0, locked: 0 };
        for (const i of combinedItems) {
            if (i.isHidden) continue;
            if (i.isLocked) { counts.locked++; continue; }
            if (i.isArchived) { counts.archive++; continue; }
            counts.all++;
            if (!i.isGroup && !i.isUnfriended) counts.friends++;
            else if (i.isGroup) counts.groups++;
            if (i.isFavorite) counts.favourites++;
        }
        return counts;
    }, [combinedItems]);

    return { filteredItems, tabCounts };
};
