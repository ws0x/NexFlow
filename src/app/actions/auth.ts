'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export type LoginState = { error: string } | null

/**
 * Server Action for credentials sign-in.
 * Replaces the client-side `signIn` from `next-auth/react` which requires
 * 3 round trips (getProviders → getCsrfToken → callback POST) that are
 * unreliable on Vercel cold starts.
 *
 * On success: NextAuth throws a NEXT_REDIRECT — re-throw it so Next.js
 * handles the redirect.  On auth failure: return an error object.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email:      formData.get('email')    as string,
      password:   formData.get('password') as string,
      redirectTo: '/',
    })
    return null // unreachable — signIn always redirects or throws
  } catch (err) {
    // Re-throw Next.js redirect objects so the browser navigates
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err

    if (err instanceof AuthError) {
      return { error: 'Invalid email or password. Please try again.' }
    }

    console.error('[loginAction]', err)
    return { error: 'Sign-in failed. Please try again.' }
  }
}
