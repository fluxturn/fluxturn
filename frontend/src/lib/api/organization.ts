import { api } from '../api'

export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    username?: string
  }
}

export interface OrganizationInvitation {
  id: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  token: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

export const organizationApi = {
  // Member management
  getMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    api.setOrganizationId(organizationId)
    return api.get<OrganizationMember[]>('/organization/members')
  },

  inviteMember: async (organizationId: string, email: string, role: string, message?: string) => {
    api.setOrganizationId(organizationId)
    return api.post('/organization/members/invite', { email, role, message })
  },

  removeMember: async (organizationId: string, userId: string) => {
    api.setOrganizationId(organizationId)
    return api.delete(`/organization/members/${userId}`)
  },

  updateMemberRole: async (organizationId: string, userId: string, role: string) => {
    api.setOrganizationId(organizationId)
    return api.patch(`/organization/members/${userId}/role`, { role })
  },

  // Invitation management
  getInvitations: async (organizationId: string): Promise<OrganizationInvitation[]> => {
    api.setOrganizationId(organizationId)
    return api.get<OrganizationInvitation[]>('/organization/invitations')
  },

  resendInvitation: async (organizationId: string, invitationId: string) => {
    api.setOrganizationId(organizationId)
    return api.post(`/organization/invitations/${invitationId}/resend`)
  },

  cancelInvitation: async (organizationId: string, invitationId: string) => {
    api.setOrganizationId(organizationId)
    return api.delete(`/organization/invitations/${invitationId}`)
  },

  // Public invitation endpoints (no auth)
  getInvitationByToken: async (token: string) => {
    return api.get(`/organization/invitations/${token}`)
  },

  acceptInvitation: async (token: string, userId?: string) => {
    return api.post(`/organization/invitations/${token}/accept`, { userId })
  },

  declineInvitation: async (token: string) => {
    return api.post(`/organization/invitations/${token}/decline`)
  },

  // Organization settings
  getUserOrganizations: async () => {
    return api.get('/organization/user/list')
  },

  getOrganizationDetails: async (organizationId: string) => {
    api.setOrganizationId(organizationId)
    return api.get(`/organization`)
  },

  updateOrganization: async (organizationId: string, data: { name?: string; description?: string }) => {
    api.setOrganizationId(organizationId)
    return api.patch(`/organization`, data)
  },

  deleteOrganization: async (organizationId: string) => {
    api.setOrganizationId(organizationId)
    return api.delete(`/organization`)
  }
}
