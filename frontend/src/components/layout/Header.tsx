import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { OrganizationSelector } from "../organizations/OrganizationSelector";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  LogOut,
  Settings,
  User,
  Menu,
  X,
  Download,
  CreditCard,
  Shield,
  FileText,
  Crown,
  Zap,
  Heart,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { PreviewBadge } from "../ui/PreviewBadge";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

export function Header() {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { organizationId } = useParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const navigationKeys = [
    { key: "features", href: "/features" },
    { key: "tutorials", href: "/tutorials" },
    { key: "templates", href: "/templates" },
    { key: "pricing", href: "/#pricing" },
    { key: "documents", href: "/docs" },
    { key: "blog", href: "/blog" },
  ];

  const userWorkspaceNavigation = [
    { name: "Organizations", href: "/organizations" },
    { name: "Projects", href: "/projects" },
  ];

  // Determine if we're in admin area
  const isAdminArea = location.pathname.startsWith("/admin");

  // Determine if we should show user workspace navigation (only for regular users not in admin area)
  const isInWorkspace =
    location.pathname.startsWith("/organizations") ||
    location.pathname.startsWith("/projects") ||
    location.pathname.match(/^\/[^\/]+\/projects/);

  const isScrollLink = (href: string) => href.startsWith("/#");

  const handleScrollLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (isScrollLink(href)) {
      e.preventDefault();
      const targetId = href.substring(2);

      // If we're not on the homepage, navigate to homepage first
      if (location.pathname !== "/") {
        // Navigate with state to tell HomePage which section to scroll to
        navigate("/", { state: { scrollToSection: targetId } });
      } else {
        // We're already on homepage, just scroll
        const element = document.getElementById(targetId);
        if (element) {
          const yOffset = -80;
          const y =
            element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    } else if (href === "/docs" || href === "/blog") {
      // When navigating to docs or blog, scroll immediately then navigate
      e.preventDefault();
      window.scrollTo(0, 0);
      navigate(href);
      // Force scroll again after navigation
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-gray-900/50 border-b border-emerald-500/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="FluxTurn Logo"
                className="w-8 h-8 object-contain"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                FluxTurn
              </h1>
              <div className="ml-3 mb-2">
                <PreviewBadge />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navigationKeys.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href === "/docs" &&
                  location.pathname.startsWith("/docs")) ||
                (item.href === "/blog" &&
                  location.pathname.startsWith("/blog"));
              return isScrollLink(item.href) || item.href === "/docs" || item.href === "/blog" ? (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleScrollLink(e, item.href)}
                  className={cn(
                    "text-gray-300 hover:text-white transition-colors cursor-pointer",
                    isActive && "text-emerald-400"
                  )}
                >
                  {t(`nav.${item.key}`)}
                </a>
              ) : (
                <Link
                  key={item.key}
                  to={item.href}
                  className={cn(
                    "text-gray-300 hover:text-white transition-colors",
                    isActive && "text-emerald-400"
                  )}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher variant="header" showFlag={true} />
            {isAuthenticated ? (
              <>
                {/* Admin link - only visible for admin users */}
                {user?.role === 'admin' && (
                  <Link to="/admin/users">
                    <Button
                      variant="ghost"
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/50"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {t('nav.admin')}
                    </Button>
                  </Link>
                )}
                <Link to="/organizations">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all">
                    {t('nav.dashboard')}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-300 hover:text-white hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all">
                    {t('nav.getStarted')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Preview Mode Indicator */}
            <div className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-md border border-red-500">
              PREVIEW
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-lg border-b border-emerald-500/20">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navigationKeys.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href === "/docs" &&
                  location.pathname.startsWith("/docs")) ||
                (item.href === "/blog" &&
                  location.pathname.startsWith("/blog"));
              return isScrollLink(item.href) || item.href === "/docs" || item.href === "/blog" ? (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={(e) => {
                    handleScrollLink(e, item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium cursor-pointer",
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-gray-300 hover:text-white hover:bg-emerald-500/10"
                  )}
                >
                  {t(`nav.${item.key}`)}
                </a>
              ) : (
                <Link
                  key={item.key}
                  to={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-gray-300 hover:text-white hover:bg-emerald-500/10"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
            <div className="pt-4 space-y-2">
              <div className="px-3 py-2">
                <LanguageSwitcher variant="header" showFlag={true} showLabel={true} />
              </div>
              {isAuthenticated ? (
                <>
                  {/* Admin link - only visible for admin users */}
                  {user?.role === 'admin' && (
                    <Link to="/admin/users" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/30 mb-2"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {t('nav.admin')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/organizations" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                      {t('nav.dashboard')}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full text-gray-300 hover:text-white hover:bg-emerald-500/10"
                    >
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                      {t('nav.getStarted')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
