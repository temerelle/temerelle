// "Probably signed in" flag, as in Motion Gym: set on sign-in, cleared on sign-out or a failed refresh.
// The session cookies are httpOnly, so JS can't see them; without the flag a signed-out visitor's page would
// call the API just to get a 401. Only a hint: the API still decides
const KEY = "temerelle_signed_in";

// Storage blocked (private mode): assume signed in and let the API answer
export function readAuthFlag(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function setAuthFlag(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Deliberately empty: the flag is only a hint
  }
}

// For useSyncExternalStore: the flag is read once per render, no events to follow
export const noopSubscribe = () => () => {};
