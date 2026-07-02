import apiClient from "./axios";

export const orgService = {
  async createOrganization(name, description) {
    const response = await apiClient.post("/organizations", {
      name,
      description,
    });
    return response.data;
  },

  async updateOrganization(orgId, name, description) {
    const response = await apiClient.put(`/organizations/${orgId}`, {
      name,
      description,
    });
    return response.data;
  },

  async getMembers() {
    const response = await apiClient.get("/organizations/members");
    return response.data;
  },

  async inviteMember(email) {
    const response = await apiClient.post("/organizations/invite", { email });
    return response.data;
  },

  async joinOrganization(token) {
    const response = await apiClient.post("/organizations/join", { token });
    return response.data;
  },

  async leaveOrganization() {
    const response = await apiClient.post("/organizations/leave");
    return response.data;
  },

  async updateMember(memberId, payload) {
    const response = await apiClient.patch(`/organizations/members/${memberId}`, payload);
    return response.data;
  },
};
