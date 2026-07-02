import apiClient from "./axios";

export const authService = {
  async register(username, email, password) {
    const response = await apiClient.post("/auth/register", {
      username,
      email,
      password,
    });
    return response.data;
  },

  async login(emailOrUsername, password) {
    const response = await apiClient.post("/auth/login", {
      emailOrUsername,
      password,
    });
    return response.data;
  },

  async logout() {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  async verifyEmail(verificationToken) {
    const response = await apiClient.get(`/auth/verify-email/${verificationToken}`);
    return response.data;
  },

  async resendVerification() {
    const response = await apiClient.post("/auth/resend-email-verification");
    return response.data;
  },

  async forgotPassword(email) {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(resetToken, newPassword) {
    const response = await apiClient.post(`/auth/reset-password/${resetToken}`, {
      newPassword,
    });
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await apiClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  async refreshToken() {
    const response = await apiClient.post("/auth/refresh-token");
    return response.data;
  },

  async updateProfile(skills) {
    const response = await apiClient.patch("/auth/profile", { skills });
    return response.data;
  },
};
