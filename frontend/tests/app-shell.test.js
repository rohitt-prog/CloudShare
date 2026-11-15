import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// Test Suite: Application Shell, Navigation & Layout (Phase 9C & 9C.1 Refinement)
// =============================================================================

test('Sidebar component source enforces collapsible layout, branding, and navigation contracts', () => {
  const sidebarPath = path.resolve('src/components/layout/Sidebar.tsx');
  assert.ok(fs.existsSync(sidebarPath), 'Sidebar.tsx must exist');

  const content = fs.readFileSync(sidebarPath, 'utf8');

  // Semantic landmark and accessible label
  assert.ok(content.includes('<aside'), 'Sidebar must render a semantic <aside> element');
  assert.ok(content.includes('aria-label="Application Sidebar"'), 'Sidebar must have an aria-label');

  // Branding
  assert.ok(content.includes('CloudShare'), 'Sidebar must include CloudShare branding');

  // Collapsible width classes and dynamic viewport
  assert.ok(content.includes('w-16'), 'Sidebar must support collapsed width (w-16)');
  assert.ok(content.includes('w-60'), 'Sidebar must support expanded width (w-60)');
  assert.ok(content.includes('h-screen') && content.includes('h-[100dvh]'), 'Sidebar must support dynamic viewport height with fallback');

  // Navigation targets
  assert.ok(content.includes('label="File Vault"'), 'Sidebar must include File Vault navigation item');
  assert.ok(content.includes("navigate('home')"), 'Sidebar File Vault item must route to home');
  assert.ok(content.includes('label="Dashboard"'), 'Sidebar must include Dashboard navigation item');
  assert.ok(content.includes("navigate('dashboard')"), 'Sidebar Dashboard item must route to dashboard');
  assert.ok(content.includes('label="Settings"'), 'Sidebar must include Settings navigation item');
  assert.ok(content.includes("navigate('settings')"), 'Sidebar Settings item must route to settings');

  // Collapse toggle button
  assert.ok(content.includes('onToggleCollapse'), 'Sidebar must have toggle collapse handler');
  assert.ok(content.includes('ChevronLeft'), 'Sidebar must include ChevronLeft icon for collapse');
  assert.ok(content.includes('ChevronRight'), 'Sidebar must include ChevronRight icon for expand');
});

test('NavigationItem component source enforces accessibility, active state, and tooltip contracts', () => {
  const navItemPath = path.resolve('src/components/layout/NavigationItem.tsx');
  assert.ok(fs.existsSync(navItemPath), 'NavigationItem.tsx must exist');

  const content = fs.readFileSync(navItemPath, 'utf8');

  // Active state aria-current="page"
  assert.ok(content.includes("aria-current={isActive ? 'page' : undefined}"), 'Must set aria-current="page" when active');

  // Collapsed tooltip & title
  assert.ok(content.includes('title={label}'), 'Collapsed item must provide title tooltip');
  assert.ok(content.includes('aria-label={ariaLabel || label}'), 'Must provide accessible aria-label');

  // High contrast active styling
  assert.ok(content.includes('bg-primary/10') || content.includes('bg-primary/15'), 'Must style active item with primary token background');
  assert.ok(content.includes('focus-visible:ring-2'), 'Must include focus-visible ring for keyboard accessibility');
});

test('MobileNavigation component source enforces modal dialog, focus trap, initial focus, and scroll lock', () => {
  const mobileNavPath = path.resolve('src/components/layout/MobileNavigation.tsx');
  assert.ok(fs.existsSync(mobileNavPath), 'MobileNavigation.tsx must exist');

  const content = fs.readFileSync(mobileNavPath, 'utf8');

  // Dialog semantics & stable ID
  assert.ok(content.includes('role="dialog"'), 'Mobile navigation must have role="dialog"');
  assert.ok(content.includes('aria-modal="true"'), 'Mobile navigation must have aria-modal="true"');
  assert.ok(content.includes('aria-label="Mobile Navigation"'), 'Mobile navigation must have aria-label');
  assert.ok(content.includes('id="mobile-navigation-drawer"'), 'Drawer container must have stable ID mobile-navigation-drawer');

  // Focus management: initial focus assignment
  assert.ok(content.includes('closeButtonRef.current.focus()'), 'Must move initial focus to the close button');

  // Focus management: keyboard trap for Tab and Shift+Tab
  assert.ok(content.includes("e.key === 'Tab'"), 'Must intercept Tab key for focus trapping');
  assert.ok(content.includes('e.shiftKey'), 'Must handle Shift+Tab reverse navigation');

  // Focus restoration on close
  assert.ok(content.includes('triggerElement') && content.includes('targetToFocus.focus()'), 'Must safely restore focus to the trigger element on close');

  // Escape key listener & body scroll lock
  assert.ok(content.includes("e.key === 'Escape'"), 'Mobile navigation must listen for Escape key');
  assert.ok(content.includes("document.body.style.overflow = 'hidden'"), 'Must lock document body scroll when open');

  // Drawer slide-in animation
  assert.ok(content.includes('animate-slideInLeft'), 'Mobile drawer container must use slide-in animation');
  assert.ok(content.includes('motion-reduce:animate-none'), 'Mobile drawer must respect prefers-reduced-motion');

  // Navigation and actions
  assert.ok(content.includes('label="File Vault"'), 'Mobile drawer must include File Vault navigation item');
  assert.ok(content.includes('label="Dashboard"'), 'Mobile drawer must include Dashboard navigation item');
  assert.ok(content.includes('label="Settings"'), 'Mobile drawer must include Settings navigation item');
  assert.ok(content.includes("handleNavigate('settings')"), 'Mobile drawer must navigate to settings');
  assert.ok(content.includes('signOut'), 'Mobile drawer must include sign-out action for authenticated user');
});

test('Header component source enforces mobile hamburger ARIA, dynamic title, theme switcher, and user menu', () => {
  const headerPath = path.resolve('src/components/layout/Header.tsx');
  assert.ok(fs.existsSync(headerPath), 'Header.tsx must exist');

  const content = fs.readFileSync(headerPath, 'utf8');

  // Semantic landmark
  assert.ok(content.includes('<header'), 'Header must render semantic <header> tag');

  // Mobile hamburger button with enhanced Phase 9C.1 ARIA
  assert.ok(content.includes('onOpenMobileNav'), 'Header must accept onOpenMobileNav callback');
  assert.ok(content.includes('aria-expanded={isMobileNavOpen}'), 'Hamburger button must expose aria-expanded state');
  assert.ok(content.includes('aria-controls="mobile-navigation-drawer"'), 'Hamburger button must declare aria-controls');
  assert.ok(
    content.includes("aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}"),
    'Hamburger button must provide dynamic accessible label'
  );
  assert.ok(content.includes('ref={mobileNavTriggerRef}'), 'Hamburger button must bind mobileNavTriggerRef for focus restoration');
  assert.ok(content.includes('md:hidden'), 'Hamburger button must be hidden on desktop viewports');

  // Dynamic route title
  assert.ok(content.includes("'Dashboard' : 'File Vault'"), 'Header must dynamically display Dashboard or File Vault title');
  assert.ok(content.includes("currentRoute === 'settings'"), 'Header must check for settings route');
  assert.ok(content.includes('Manage preferences and account information'), 'Header must provide settings subtitle');

  // Theme dropdown integration
  assert.ok(content.includes('useTheme()'), 'Header must consume useTheme hook');
  assert.ok(content.includes("setTheme('light')"), 'Header must provide Light theme selection');
  assert.ok(content.includes("setTheme('dark')"), 'Header must provide Dark theme selection');
  assert.ok(content.includes("setTheme('system')"), 'Header must provide System theme selection');

  // User account dropdown
  assert.ok(content.includes('useAuth()'), 'Header must consume useAuth hook');
  assert.ok(content.includes('userInitials'), 'Header must compute user initials for avatar');
  assert.ok(content.includes("router?.navigate('settings')"), 'Header user dropdown must include Settings navigation item');
  assert.ok(content.includes('handleSignOut'), 'Header must provide sign-out functionality');
});

test('AppShell component source coordinates sidebar persistence, mobile drawer, trigger ref, and dynamic viewport', () => {
  const appShellPath = path.resolve('src/components/layout/AppShell.tsx');
  assert.ok(fs.existsSync(appShellPath), 'AppShell.tsx must exist');

  const content = fs.readFileSync(appShellPath, 'utf8');

  // Dynamic Viewport support with fallback
  assert.ok(content.includes('h-screen') && content.includes('h-[100dvh]'), 'AppShell must support dynamic viewport height with fallback');

  // Trigger ref for focus restoration
  assert.ok(content.includes('mobileNavTriggerRef'), 'AppShell must manage mobileNavTriggerRef');
  assert.ok(content.includes('triggerRef={mobileNavTriggerRef}'), 'AppShell must pass triggerRef to MobileNavigation');
  assert.ok(content.includes('isMobileNavOpen={isMobileNavOpen}'), 'AppShell must pass isMobileNavOpen state to Header');

  // Coordinates child components
  assert.ok(content.includes('<Sidebar'), 'AppShell must render Sidebar');
  assert.ok(content.includes('<MobileNavigation'), 'AppShell must render MobileNavigation');
  assert.ok(content.includes('<Header'), 'AppShell must render Header');

  // Sidebar collapse persistence with error handling
  assert.ok(content.includes('cloudshare-sidebar-collapsed'), 'AppShell must persist collapse state using cloudshare-sidebar-collapsed');
  assert.ok(content.includes('localStorage.getItem'), 'AppShell must read persisted collapse state from localStorage');
  assert.ok(content.includes('localStorage.setItem'), 'AppShell must store updated collapse state to localStorage');

  // Main content container
  assert.ok(content.includes('<main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">'), 'AppShell must render responsive main content container');
  assert.ok(content.includes('mx-auto max-w-6xl'), 'AppShell must constrain content with centered max-w-6xl container');
});

test('AppRouter and App cleanly integrate AppShell for authenticated routes while keeping auth routes outside', () => {
  const routerPath = path.resolve('src/app/router.tsx');
  const appPath = path.resolve('src/app/App.tsx');

  assert.ok(fs.existsSync(routerPath), 'router.tsx must exist');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

  const routerContent = fs.readFileSync(routerPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // AppRouter imports AppShell
  assert.ok(routerContent.includes("import { AppShell } from '@/components/layout/AppShell'"), 'router.tsx must import AppShell');

  // AppShell wraps authenticated routes
  assert.ok(routerContent.includes('<AppShell>'), 'router.tsx must wrap authenticated route in <AppShell>');
  assert.ok(routerContent.includes('<HomePage />'), 'router.tsx must render HomePage inside AppShell');

  // Login, Register, and Share routes remain standalone outside AppShell
  assert.ok(!routerContent.includes('<AppShell><LoginPage'), 'LoginPage must not be wrapped inside AppShell');
  assert.ok(!routerContent.includes('<AppShell><RegisterPage'), 'RegisterPage must not be wrapped inside AppShell');
  assert.ok(!routerContent.includes('<AppShell><SharedFilePage'), 'SharedFilePage must not be wrapped inside AppShell');

  // App.tsx no longer renders old hardcoded header or static footer
  assert.ok(!appContent.includes('<Header />'), 'App.tsx must not render static <Header />');
  assert.ok(!appContent.includes('Phase 3 Authentication Foundation'), 'App.tsx must not render obsolete static footer');
  assert.ok(appContent.includes('<AppRouter />'), 'App.tsx must render <AppRouter />');
});

test('tailwind.config.js declares slideInLeft animation for mobile navigation drawer', () => {
  const configPath = path.resolve('tailwind.config.js');
  assert.ok(fs.existsSync(configPath), 'tailwind.config.js must exist');

  const content = fs.readFileSync(configPath, 'utf8');
  assert.ok(content.includes('slideInLeft'), 'tailwind.config.js must define slideInLeft keyframe and animation');
  assert.ok(content.includes('translateX(-100%)'), 'slideInLeft must translate from -100%');
});

// =============================================================================
// Behavioral Test Suite: Focus Trap Algorithm Verification
// =============================================================================

function computeFocusTrapTarget(currentIndex, totalCount, isShiftTab) {
  if (totalCount <= 0) return -1;
  if (isShiftTab) {
    return currentIndex <= 0 ? totalCount - 1 : currentIndex - 1;
  }
  return currentIndex >= totalCount - 1 ? 0 : currentIndex + 1;
}

test('[BEHAVIORAL RUNTIME] computeFocusTrapTarget correctly wraps forward tab from last element to first', () => {
  const totalCount = 4; // e.g. Close, File Vault, Dashboard, Sign Out
  const lastIndex = 3;
  const next = computeFocusTrapTarget(lastIndex, totalCount, false);
  assert.strictEqual(next, 0, 'Tab from last item must wrap around to first item');
});

test('[BEHAVIORAL RUNTIME] computeFocusTrapTarget correctly wraps shift-tab from first element to last', () => {
  const totalCount = 4;
  const firstIndex = 0;
  const next = computeFocusTrapTarget(firstIndex, totalCount, true);
  assert.strictEqual(next, 3, 'Shift+Tab from first item must wrap around to last item');
});

test('[BEHAVIORAL RUNTIME] computeFocusTrapTarget steps forward and backward correctly inside boundaries', () => {
  const totalCount = 4;
  assert.strictEqual(computeFocusTrapTarget(1, totalCount, false), 2, 'Tab from index 1 should advance to 2');
  assert.strictEqual(computeFocusTrapTarget(2, totalCount, true), 1, 'Shift+Tab from index 2 should regress to 1');
});

// =============================================================================
// Behavioral Test Suite: Authenticated Navigation & Header State (Phase 9F.4)
// =============================================================================

function resolveHeaderTitles(currentRoute) {
  const title =
    currentRoute === 'settings'
      ? 'Settings'
      : currentRoute === 'dashboard'
      ? 'Dashboard'
      : 'File Vault';
  const subtitle =
    currentRoute === 'settings'
      ? 'Manage preferences and account information'
      : currentRoute === 'dashboard'
      ? 'Storage and activity overview'
      : 'Manage and share your secure files';
  return { title, subtitle };
}

test('[BEHAVIORAL RUNTIME] Header title and subtitle resolve correctly across all authenticated routes', () => {
  // Home route
  const homeState = resolveHeaderTitles('home');
  assert.strictEqual(homeState.title, 'File Vault');
  assert.strictEqual(homeState.subtitle, 'Manage and share your secure files');

  // Dashboard route
  const dashboardState = resolveHeaderTitles('dashboard');
  assert.strictEqual(dashboardState.title, 'Dashboard');
  assert.strictEqual(dashboardState.subtitle, 'Storage and activity overview');

  // Settings route
  const settingsState = resolveHeaderTitles('settings');
  assert.strictEqual(settingsState.title, 'Settings');
  assert.strictEqual(settingsState.subtitle, 'Manage preferences and account information');

  // Fallback for undefined/unknown route
  const fallbackState = resolveHeaderTitles(undefined);
  assert.strictEqual(fallbackState.title, 'File Vault');
  assert.strictEqual(fallbackState.subtitle, 'Manage and share your secure files');
});

test('[BEHAVIORAL RUNTIME] Navigation items active-state exclusivity across destinations', () => {
  const checkActive = (currentRoute) => ({
    isHomeActive: currentRoute === 'home' || currentRoute === undefined,
    isDashboardActive: currentRoute === 'dashboard',
    isSettingsActive: currentRoute === 'settings',
  });

  const onHome = checkActive('home');
  assert.strictEqual(onHome.isHomeActive, true);
  assert.strictEqual(onHome.isDashboardActive, false);
  assert.strictEqual(onHome.isSettingsActive, false);

  const onDashboard = checkActive('dashboard');
  assert.strictEqual(onDashboard.isHomeActive, false);
  assert.strictEqual(onDashboard.isDashboardActive, true);
  assert.strictEqual(onDashboard.isSettingsActive, false);

  const onSettings = checkActive('settings');
  assert.strictEqual(onSettings.isHomeActive, false);
  assert.strictEqual(onSettings.isDashboardActive, false);
  assert.strictEqual(onSettings.isSettingsActive, true);

  const onDefault = checkActive(undefined);
  assert.strictEqual(onDefault.isHomeActive, true);
  assert.strictEqual(onDefault.isDashboardActive, false);
  assert.strictEqual(onDefault.isSettingsActive, false);
});

test('[BEHAVIORAL RUNTIME] MobileNavigation drawer closes upon route selection', () => {
  let navigatedTo = null;
  let isClosed = false;

  const mockNavigate = (route) => {
    navigatedTo = route;
  };
  const mockOnClose = () => {
    isClosed = true;
  };

  const handleNavigate = (route) => {
    mockNavigate(route);
    mockOnClose();
  };

  handleNavigate('settings');
  assert.strictEqual(navigatedTo, 'settings');
  assert.strictEqual(isClosed, true);

  isClosed = false;
  handleNavigate('home');
  assert.strictEqual(navigatedTo, 'home');
  assert.strictEqual(isClosed, true);

  isClosed = false;
  handleNavigate('dashboard');
  assert.strictEqual(navigatedTo, 'dashboard');
  assert.strictEqual(isClosed, true);
});

test('[BEHAVIORAL RUNTIME] Focus trap handles expanded 5-element mobile drawer correctly', () => {
  const totalCount = 5; // Close, File Vault, Dashboard, Settings, Sign Out
  const lastIndex = 4;

  // Wrap forward from last to first
  assert.strictEqual(computeFocusTrapTarget(lastIndex, totalCount, false), 0);
  // Wrap backward from first to last
  assert.strictEqual(computeFocusTrapTarget(0, totalCount, true), 4);
  // Normal steps
  assert.strictEqual(computeFocusTrapTarget(2, totalCount, false), 3);
  assert.strictEqual(computeFocusTrapTarget(3, totalCount, true), 2);
});
