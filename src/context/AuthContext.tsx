import React, { createContext, useContext } from "react";
import { useGetCurrentUser, useLogoutWeb } from "@/api/generated/endpoints/auth-controller/auth-controller";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { hasPermission, type Permission } from "@/lib/permissions";
import { HAD_SESSION_KEY } from "@/api/custom-fetch";

export type UserProfile = {
    username: string;
    email: string;
    employeeName?: string;
    superuser?: boolean;
    // Granted projection ids, e.g. "GET:/api/weights/mine"
    permissions?: string[];
};

interface AuthContextType {
    user: UserProfile | undefined;
    isLoading: boolean;
    isAuthenticated: boolean;
    // Hides what the user may not use; the backend still checks every call
    can: (permission: Permission) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Automatically calls /api/auth/me/web and checks the HttpOnly cookie
    const { data: response, isLoading, isError } = useGetCurrentUser({
        query: {
            retry: false, // Don't spam retries if the user isn't logged in
            refetchOnWindowFocus: false,
            // Not being logged in is not an error: ProtectedRoute sends the user to /login
            meta: { errorToast: false },
        }
    });

    const user = response as unknown as UserProfile | undefined;
    
    const { mutate: doLogout } = useLogoutWeb();

    const logout = () => {
        // The server ends the session in the refresh_jwt cookie; no body
        doLogout(
            undefined,
            {
                onSuccess: () => {
                    queryClient.clear();
                    localStorage.removeItem(HAD_SESSION_KEY);
                    navigate("/login");
                },
            }
        );
    };

    const isAuthenticated = !isError && !!user;
    const can = (permission: Permission) => hasPermission(user, permission);

    return (
        <AuthContext.Provider value={{ user, isLoading, isAuthenticated, can, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to access auth state anywhere instantly
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};