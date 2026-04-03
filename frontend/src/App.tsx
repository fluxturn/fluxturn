import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ContextProviders } from "./contexts";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { Toaster } from "sonner";

// Authentication pages
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { AuthSuccess } from "./pages/auth/AuthSuccess";
import { AuthError } from "./pages/auth/AuthError";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { VerifyEmail } from "./pages/auth/VerifyEmail";

// Workflow pages
import { WorkflowBuilderNew } from "./pages/workflows/WorkflowBuilderNew";
import { TemplatesGallery } from "./pages/workflows/TemplatesGallery";

// Public pages
import PublicForm from "./pages/PublicForm";
import { OAuthCallback } from "./pages/OAuthCallback";

// Workflow Dashboard
import { WorkflowDashboard } from "./pages/workflows/WorkflowDashboard";

// Landing page
import Landing from "./pages/Landing";
import { PublicLayout } from "./components/layout/PublicLayout";

// Public pages
import { Pricing } from "./pages/Pricing";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { Security } from "./pages/Security";
import { Templates } from "./pages/Templates";
import { TemplateDetail } from "./pages/TemplateDetail";
import { UseCases } from "./pages/UseCases";
import { UseCaseDetail } from "./pages/UseCaseDetail";
import { Docs } from "./pages/Docs";
import { Support } from "./pages/Support";
import { Features } from "./pages/Features";
import { Tutorials } from "./pages/Tutorials";

// Blog pages
import { BlogList, BlogPost, CreateBlog, UpdateBlog, MyBlogs } from "./pages/blog";

// Organization pages
import { OrganizationList } from "./pages/organizations/OrganizationList";
import { CreateOrganizationSimple } from "./pages/organizations/CreateOrganizationSimple";
import { OrganizationDashboard } from "./pages/organizations/OrganizationDashboard";
import { OrganizationMembers } from "./pages/organizations/OrganizationMembers";
import { OrganizationSettings } from "./pages/organizations/OrganizationSettings";
import { OrganizationBillingPage } from "./pages/organizations/OrganizationBillingPage";
import { OrganizationIntegrations } from "./pages/organizations/OrganizationIntegrations";
import { AcceptInvitationPage } from "./pages/organizations/AcceptInvitationPage";

// Project pages
import { ProjectList } from "./pages/projects/ProjectList";
import { CreateProjectSimple } from "./pages/projects/CreateProjectSimple";
import { ProjectDashboard } from "./pages/projects/ProjectDashboard";
import { ProjectDashboardReal } from "./pages/projects/ProjectDashboardReal";
import { ProjectSettings } from "./pages/projects/ProjectSettings";
import { ProjectCollaborators } from "./pages/projects/ProjectCollaborators";
import { ProjectDeployments } from "./pages/projects/ProjectDeployments";

// Admin pages
import { AdminUserList } from "./pages/admin/AdminUserList";

// Profile pages
// TODO: ProfileSettings doesn't exist yet
// import { ProfileSettings } from "./pages/profile/ProfileSettings";

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ContextProviders>
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          closeButton
          duration={4000}
        />
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />

          {/* Public Form Route - No authentication required */}
          <Route path="/forms/:workflowId" element={<PublicForm />} />

          {/* OAuth Callback Route - No authentication required */}
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Accept Invitation Route */}
          <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />

          {/* Public Pages with Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/use-cases/:id" element={<UseCaseDetail />} />
            <Route path="/support" element={<Support />} />
            {/* Blog Routes - specific routes MUST come before :slug */}
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/create" element={<ProtectedRoute><CreateBlog /></ProtectedRoute>} />
            <Route path="/blog/edit/:id" element={<ProtectedRoute><UpdateBlog /></ProtectedRoute>} />
            <Route path="/blog/my-posts" element={<ProtectedRoute><MyBlogs /></ProtectedRoute>} />
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Route>

          {/* Docs Routes - With PublicLayout for header and footer */}
          <Route element={<PublicLayout />}>
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:slug" element={<Docs />} />
          </Route>

          {/* Protected Routes */}

          {/* Legacy workflow routes - redirect to orgs */}
          <Route path="/workflows" element={<Navigate to="/orgs" replace />} />
          <Route path="/dashboard" element={<Navigate to="/orgs" replace />} />

          {/* Profile Settings */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <div>Profile Settings - Coming Soon</div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminUserList />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Organizations Routes */}
          <Route
            path="/orgs"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/orgs/new"
            element={
              <ProtectedRoute>
                <CreateOrganizationSimple />
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/members"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationMembers />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/billing"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationBillingPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/integrations"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationIntegrations />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Projects Routes */}
          <Route
            path="/org/:organizationId/projects"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/projects/new"
            element={
              <ProtectedRoute>
                <CreateProjectSimple />
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDashboardReal />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId/collaborators"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectCollaborators />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId/deployments"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDeployments />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Workflow Routes - Under Projects */}
          <Route
            path="/org/:organizationId/project/:projectId/workflows"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkflowDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId/templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <TemplatesGallery />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/org/:organizationId/project/:projectId/workflows/:id"
            element={
              <ProtectedRoute>
                <Layout noPadding={true}>
                  <WorkflowBuilderNew />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to orgs list */}
          <Route path="*" element={<Navigate to="/orgs" replace />} />
        </Routes>
      </ContextProviders>
    </Router>
  );
}

export default App;
