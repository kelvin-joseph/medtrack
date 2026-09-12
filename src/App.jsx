import { useState } from "react";
import { AppProvider, useApp, SCREENS } from "./context/AppContext.jsx";
import { RoleProvider, useRole } from "./context/RoleContext.jsx";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import Layout from "./components/Layout.jsx";
import Toast from "./components/Toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useData } from "./context/AppDataContext.jsx";

import LandingPage from "./screens/LandingPage.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import SetPasswordScreen from "./screens/SetPasswordScreen.jsx";
import OnboardingWizard from "./screens/OnboardingWizard.jsx";
import DashboardScreen from "./screens/DashboardScreen.jsx";
import EquipmentScreen from "./screens/EquipmentScreen.jsx";
import EquipmentProfileScreen from "./screens/EquipmentProfileScreen.jsx";
import EquipmentFormScreen from "./screens/EquipmentFormScreen.jsx";
import ImportEquipmentScreen from "./screens/ImportEquipmentScreen.jsx";
import MaintenanceScreen from "./screens/MaintenanceScreen.jsx";
import FaultReportScreen from "./screens/FaultReportScreen.jsx";
import AIScreen from "./screens/AIScreen.jsx";
import QRScannerScreen from "./screens/QRScannerScreen.jsx";
import CalibrationScreen from "./screens/CalibrationScreen.jsx";
import ReportsScreen from "./screens/ReportsScreen.jsx";
import NotificationsScreen from "./screens/NotificationsScreen.jsx";
import UsersScreen from "./screens/UsersScreen.jsx";
import SettingsScreen from "./screens/SettingsScreen.jsx";

const SCREEN_COMPONENTS = {
  [SCREENS.DASHBOARD]: DashboardScreen,
  [SCREENS.EQUIPMENT]: EquipmentScreen,
  [SCREENS.EQUIPMENT_PROFILE]: EquipmentProfileScreen,
  [SCREENS.EQUIPMENT_FORM]: EquipmentFormScreen,
  [SCREENS.IMPORT_EQUIPMENT]: ImportEquipmentScreen,
  [SCREENS.MAINTENANCE]: MaintenanceScreen,
  [SCREENS.FAULT_REPORTS]: FaultReportScreen,
  [SCREENS.AI_PREDICTIONS]: AIScreen,
  [SCREENS.QR_SCANNER]: QRScannerScreen,
  [SCREENS.CALIBRATION]: CalibrationScreen,
  [SCREENS.REPORTS]: ReportsScreen,
  [SCREENS.NOTIFICATIONS]: NotificationsScreen,
  [SCREENS.USERS]: UsersScreen,
  [SCREENS.SETTINGS]: SettingsScreen,
};

function AuthGate({ children }) {
  const {
    session,
    profile,
    authLoading,
    authError,
    needsPasswordSetup,
    provisioning,
    signIn,
    setAuthError,
  } = useRole();
  const [showLogin, setShowLogin] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Demo access goes through the exact same Supabase auth path as real staff
  // (signIn -> onAuthStateChange in RoleContext) — it's just a fixed set of
  // credentials for a read-only demo account, not a separate auth mechanism.
  // The account's role must be scoped to read-only via RLS + roles.js; this
  // handler doesn't grant any access on its own.
  const handleViewDemo = async () => {
    const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
    if (!demoEmail || !demoPassword) {
      setAuthError("Demo access isn't configured yet.");
      return;
    }
    setDemoLoading(true);
    setAuthError(null);
    await signIn(demoEmail, demoPassword);
    setDemoLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-sm text-muted">Loading MedTrack…</div>
      </div>
    );
  }

  const demoEnabled = Boolean(
    import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD,
  );

  if (!session) {
    return showLogin ? (
      <LoginScreen onBack={() => setShowLogin(false)} />
    ) : (
      <LandingPage
        onGetStarted={() => setShowLogin(true)}
        onViewDemo={demoEnabled ? handleViewDemo : undefined}
        demoLoading={demoLoading}
        demoError={authError}
      />
    );
  }

  // Invite/recovery link just logged them in via a one-time token — make
  // them set a real password before they can use the app.
  if (needsPasswordSetup) return <SetPasswordScreen />;

  if (provisioning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-sm text-muted">Setting up your hospital…</div>
      </div>
    );
  }

  if (!profile) {
    // Signed in, but no matching profiles row (or it failed to load) —
    // shouldn't normally happen since handle_new_user() creates one on
    // signup, but surface it clearly rather than silently proceeding
    // with a null role.
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-sm text-center">
          <p className="text-sm text-ink font-medium">
            Couldn't load your account profile
          </p>
          <p className="text-xs text-muted mt-1.5">
            {authError ||
              "Your account may not be fully set up yet. Contact your System Administrator."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-sm text-center">
          <p className="text-sm text-ink font-medium">
            This account has been deactivated
          </p>
          <p className="text-xs text-muted mt-1.5">
            Contact your System Administrator if this is unexpected.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function Shell() {
  const { screen } = useApp();
  const { isLoading, settings, toast, dismissToast } = useData();
  const { role, signOut } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-sm text-muted">Loading MedTrack…</div>
      </div>
    );
  }
  if (!settings.onboardingComplete) return <OnboardingWizard />;

  const ScreenComponent = SCREEN_COMPONENTS[screen] || DashboardScreen;

  return (
    <>
      {role === "Demo Viewer" && (
        <div className="w-full bg-accent text-white text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-3 flex-wrap">
          <span>
            You're viewing a read-only demo with sample data — nothing here is a
            real hospital's equipment or records.
          </span>
          <button
            onClick={signOut}
            className="underline font-semibold hover:opacity-90 shrink-0"
          >
            Exit Demo
          </button>
        </div>
      )}
      <Layout>
        <ErrorBoundary key={screen}>
          <ScreenComponent />
        </ErrorBoundary>
      </Layout>
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <AuthGate>
        <AppDataProvider>
          <AppProvider>
            <Shell />
          </AppProvider>
        </AppDataProvider>
      </AuthGate>
    </RoleProvider>
  );
}
