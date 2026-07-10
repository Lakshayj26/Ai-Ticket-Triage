import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../api/auth.service";

const AuthContext = createContext(null);

// Helper to extract detailed validation and response errors
const extractErrorMessage = (error, defaultMsg) => {
  const data = error.response?.data;
  if (!data) return defaultMsg;

  let msg = data.message || defaultMsg;
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    // Extract express-validator errors: [ { field: "message" }, ... ]
    const validationDetails = data.errors
      .map((err) => {
        const key = Object.keys(err)[0];
        return `${err[key]}`;
      })
      .join(", ");
    msg = `${msg} (${validationDetails})`;
  }
  return msg;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check if user has an active session (by calling refresh-token)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await authService.refreshToken();
        if (response.success && response.data) {
          const { accesssToken, user: userData } = response.data;
          localStorage.setItem("accessToken", accesssToken);
          setUser(userData);
        }
      } catch (error) {
        console.log("No active session found.");
        localStorage.removeItem("accessToken");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const googleLogin = async (credential) => {
    setLoading(true);
    try {
      const response = await authService.googleLogin(credential);
      if (response.success && response.data) {
        const { accesssToken, user: userData } = response.data;
        localStorage.setItem("accessToken", accesssToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.message || "Google login failed" };
    } catch (error) {
      console.error("Google login error:", error);
      const msg = extractErrorMessage(error, "Google login failed. Please try again.");
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername, password) => {
    setLoading(true);
    try {
      const response = await authService.login(emailOrUsername, password);
      if (response.success && response.data) {
        const { accesssToken, user: userData } = response.data;
        localStorage.setItem("accessToken", accesssToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.message || "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      const msg = extractErrorMessage(error, "Invalid credentials. Please try again.");
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await authService.register(username, email, password);
      if (response.success) {
        return { success: true, message: response.message };
      }
      return { success: false, message: response.message || "Registration failed" };
    } catch (error) {
      console.error("Registration error:", error);
      const msg = extractErrorMessage(error, "Registration failed. Try a different username/email.");
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
      localStorage.removeItem("inviteToken");
    }
  };

  const refreshUser = async (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
