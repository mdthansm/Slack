const STACK_API_URL = process.env.NEXT_PUBLIC_STACK_API_URL!;
const STACK_PROJECT_ID = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!;
const STACK_CLIENT_KEY = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!;

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-stack-project-id": STACK_PROJECT_ID,
    "x-stack-publishable-client-key": STACK_CLIENT_KEY,
    "x-stack-access-type": "client",
  };
}

export type StackAuthResult = {
  access_token: string;
  refresh_token: string;
  user_id: string;
};

export async function stackAuthSignUp(
  email: string,
  password: string
): Promise<StackAuthResult> {
  const res = await fetch(`${STACK_API_URL}/api/v1/auth/password/sign-up`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Sign up failed" }));
    const msg =
      error.error || error.message || error.details?.message || "Sign up failed";
    if (msg.includes("already exists") || msg.includes("USER_EMAIL_ALREADY_EXISTS")) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function stackAuthSignIn(
  email: string,
  password: string
): Promise<StackAuthResult> {
  const res = await fetch(`${STACK_API_URL}/api/v1/auth/password/sign-in`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Sign in failed" }));
    const msg =
      error.error || error.message || error.details?.message || "Invalid email or password.";
    throw new Error(msg);
  }
  return res.json();
}
