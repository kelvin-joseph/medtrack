import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient.js";
import { PERMISSIONS, NAV_ACCESS } from "../data/roles.js";

const RoleContext = createContext(null);

/**
 * Real authentication, backed by Supabase Auth + the `profiles` table.
 * The hook is still called `useRole` (and this file still `RoleContext.jsx`)
 * to avoid touching every consumer's import path — but it now carries a
 * real session and a real per-user profile, not a client-side role picker.
 */
export function RoleProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  // True when the URL is a Supabase invite/recovery link (?type=invite or
  // #...type=invite in the redirect fragment). supabase-js's
  // detectSessionInUrl already turns that link into a real session
  // automatically — this flag just tells App.jsx to show "set your
  // password" instead of the normal signed-in app until they do.
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(
    () => /type=invite|type=recovery/.test(window.location.hash)
  );
  const mounted = useRef(true);
  // Tracks whose session is currently loaded, so onAuthStateChange can tell
  // a genuine sign-in/user-change apart from a routine same-user event
  // (most commonly TOKEN_REFRESHED, which Supabase's client fires on its
  // own whenever the tab regains focus/visibility -- not a real sign-in).
  // Without this, every such event was treated identically to a fresh
  // sign-in: authLoading flipped true, and App.jsx's `if (authLoading)
  // return <Loading/>` unmounted the entire app to show it, wiping any
  // in-progress local component state (e.g. a pending file selection) --
  // even though the user never actually left MedTrack.
  const currentUserIdRef = useRef(null);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!mounted.current) return;
    if (error) {
      setAuthError(error.message);
      setProfile(null);
    } else {
      setProfile(data);
      // Best-effort — don't block the UI on this, and don't surface a failure for it.
      supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", userId).then(() => {});
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted.current) return;
      setSession(initial);
      currentUserIdRef.current = initial?.user?.id ?? null;
      if (initial) loadProfile(initial.user.id);
      else setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      const nextUserId = next?.user?.id ?? null;
      const isSameUser = Boolean(nextUserId) && nextUserId === currentUserIdRef.current;
      currentUserIdRef.current = nextUserId;

      if (!next) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }
      if (isSameUser) {
        // Routine event for someone already signed in and already loaded
        // (token refresh, tab-focus recheck, etc.) -- session state above
        // is kept fresh for future API calls, but there's no reason to
        // show the loading gate or re-fetch a profile that hasn't changed.
        return;
      }
      setAuthLoading(true);
      loadProfile(next.user.id);
    });

    return () => {
      mounted.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return { error };
    }
    return { error: null };
  }, []);

  /**
   * Self-serve "create your hospital" signup. hospitalName is carried as
   * auth user_metadata (pending_hospital_name) rather than written anywhere
   * yet — the account isn't attached to a real hospital until the
   * provisioning effect below calls the create_hospital() RPC, which is the
   * only thing allowed to actually create one. This also means the flow
   * works the same whether or not email confirmation is required: the
   * metadata survives until their first real session, whenever that is.
   *
   * Supabase deliberately returns a success-shaped response (error: null,
   * no session) when signUp() is called with an email that's already
   * registered — this prevents attackers from using signup to discover
   * which emails exist. No new account is created and no email is sent in
   * that case. The one reliable signal for it: data.user.identities comes
   * back as an empty array, even though error is null. We check for that
   * here so the person gets an honest message instead of a "check your
   * email" screen that's actually inert.
   */
  const signUp = useCallback(async (email, password, hospitalName) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Without this, Supabase falls back to whatever Site URL is
        // configured in the dashboard -- which is how confirmation links
        // ended up pointing at localhost. window.location.origin is used
        // rather than a hardcoded production URL so this is automatically
        // correct wherever the app is actually running from (production,
        // a preview deploy, or local dev) with no need to update this
        // string if the domain ever changes. Supabase still validates it
        // against the dashboard's configured Redirect URLs allow-list.
        emailRedirectTo: window.location.origin,
        data: { pending_hospital_name: hospitalName },
      },
    });
    if (error) {
      setAuthError(error.message);
      return { error };
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const message = "An account with this email already exists. Please sign in or use a different email to create a new hospital.";
      setAuthError(message);
      return { error: { message } };
    }
    return { error: null, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  // Brand-new self-serve accounts land in a placeholder hospital (see
  // migration) with no real data. As soon as we have both a session and a
  // loaded profile, if there's a pending_hospital_name waiting, provision
  // their real hospital via the create_hospital() RPC — the only path
  // that's allowed to create one — then reload the profile so the rest of
  // the app sees their real hospital_id/role.
  const provisioningRef = useRef(false);
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    if (!session || !profile) return;
    const pendingName = session.user?.user_metadata?.pending_hospital_name;
    if (!pendingName || provisioningRef.current) return;
    provisioningRef.current = true;
    setProvisioning(true);

    (async () => {
      try {
        const { error: rpcError } = await supabase.rpc("create_hospital", { hospital_name: pendingName });
        if (rpcError) {
          setAuthError(rpcError.message);
        } else {
          await loadProfile(session.user.id);
        }
      } finally {
        // Clear the pending flag regardless of outcome — an MVP tradeoff:
        // a failure here (e.g. bad name) surfaces via authError rather than
        // retrying indefinitely.
        await supabase.auth.updateUser({ data: { pending_hospital_name: null } });
        if (mounted.current) setProvisioning(false);
      }
    })();
  }, [session, profile, loadProfile]);

  /** Called from SetPasswordScreen after an invite/recovery link. */
  const completePasswordSetup = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error };
    setNeedsPasswordSetup(false);
    // Drop the token fragment from the URL so a refresh doesn't re-trigger this screen.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return { error: null };
  }, []);

  const role = profile?.role || null;
  const can = useCallback((action) => Boolean(PERMISSIONS[role]?.[action]), [role]);
  const canSeeNav = useCallback((key) => Boolean(NAV_ACCESS[role]?.includes(key)), [role]);

  return (
    <RoleContext.Provider
      value={{
        session, profile, user: profile, role,
        authLoading, authError, setAuthError,
        needsPasswordSetup, completePasswordSetup,
        signIn, signUp, signOut, provisioning,
        can, canSeeNav,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
