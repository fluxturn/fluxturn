import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Don't scroll to top if we're navigating to a specific section
    const state = location.state as { scrollToSection?: string } | null;
    if (!state?.scrollToSection) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.state]);

  return null;
}
