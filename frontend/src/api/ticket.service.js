import apiClient from "./axios";

export const ticketService = {
  async createTicket(title, description, attachments = []) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    
    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    const response = await apiClient.post("/tickets/create-ticket", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async getTickets() {
    const response = await apiClient.get("/tickets");
    return response.data;
  },

  async getTicketById(ticketId) {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  },

  async updateTicket(ticketId, data) {
    const response = await apiClient.patch(`/tickets/${ticketId}`, data);
    return response.data;
  },

  async assignTicket(ticketId, assignedToId) {
    const response = await apiClient.patch(`/tickets/${ticketId}/assign`, {
      assignedTo: assignedToId,
    });
    return response.data;
  },
};
