export interface Participant {
    userId: string;
    socketId: string;
    joinedAt: Date;
    lastSeen: Date;
    cursorPosition?: {
        line: number;
        character: number;
    };
    isTyping?: boolean;
}

export interface OptLog {
    id: string;
    type: string;
    position: number;
    content: string;
    userId: string;
    timestamp: Date;
}

export interface CurrentState {
    content: string;
    contentDelta: string; // Quill.js delta formatı
    version: number;
    lastModifiedAt: Date;
}

export interface SessionData {
    cursors?: {
        [userId: string]: {
            position: number;
            selection?: { start: number; end: number };
            color: string;
            lastUpdate: Date;
        };
    };
    activeEditors?: {
        userId: string;
        section: string;
        editingMode: string;
        startedAt: Date;
    }[];
    chatMessages?: {
        id: string;
        userId: string;
        message: string;
        timestamp: Date;
        type: 'info' | 'warning' | 'error';
    }[];
    permissions?: {
        [userId: string]: string[];
    };
    documentLocks?: {
        section: string;
        lockedBy: string;
        lockedAt: Date;
        type: 'soft-lock' | 'hard-lock';
    }[];
    versionInfo?: {
        currentVersion: string;
        lastSavedVersion: string;
        unsavedChanges: boolean;
        autoSaveEnabled: boolean;
        lastAutoSave: Date;
    };
    collaborationSettings?: {
        showCursors: boolean;
        showUserNames: boolean;
        enableRealTimeSync: boolean;
        conflictNotifications: boolean;
        chatEnabled: boolean;
    };
    analytics?: {
        totalEdits: number;
        wordCount: number;
        editsByUser: { [userId: string]: number };
        sessionDuration: number;
    };
}

export interface ConflictResolution {
    strategy: 'last-writer-wins' | 'operational-transform' | 'merge-manual';
    pendingConflicts?: {
        id: string;
        type: string;
        position: { start: number; end: number };
        operations: {
            userId: string;
            operation: string;
            content?: string;
            range?: { start: number; end: number };
            timestamp: Date;
        }[];
        status: 'pending' | 'resolved' | 'ignored';
        resolvedBy?: string;
        resolvedAt?: Date;
    }[];
    autoMergeRules?: {
        textInsertions: string;
        formatting: string;
        deletions: string;
    };
    resolutionHistory?: {
        conflictId: string;
        resolvedBy: string;
        resolution: string;
        timestamp: Date;
    }[];
}