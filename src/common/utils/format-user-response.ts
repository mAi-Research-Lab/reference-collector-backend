import { User } from "generated/prisma";
import { UserResponse } from "src/modules/user/dto/user.response";

export function formatUserResponse(user: User): UserResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = user;
    const withGuide = userResponse as typeof userResponse & { introGuideStatus?: "not_started" | "completed" | "skipped" };
    return {
        ...userResponse,
        introGuideStatus: withGuide.introGuideStatus ?? "not_started",
        preferences: formatPreferences(user.preferences) || {},
    };
}

export function formatPreferences(preferences?: any): Record<string, any> | null {
    if (!preferences) {
        return null;
    }

    if (typeof preferences === 'object') {
        return preferences;
    } else {
        return { value: preferences };
    }
}

