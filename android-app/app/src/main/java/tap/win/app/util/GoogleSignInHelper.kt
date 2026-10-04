package tap.win.app.util

import android.app.Activity
import android.content.Intent
import androidx.activity.result.IntentSenderRequest
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.GetSignInIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import tap.win.app.BuildConfig
import tap.win.app.api.ApiClient
import tap.win.app.api.AuthResponse
import tap.win.app.api.FirebaseLoginRequest
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Firebase Google Sign-In helper.
 *
 * Flow: Identity (Sign-In API) asks Google for an ID token (using the Web OAuth
 * client id from BuildConfig.GOOGLE_WEB_CLIENT_ID, injected by Codemagic /
 * gradle.properties), we exchange it with Firebase Auth, then send the Firebase
 * ID token to our backend (`POST api/auth/firebase`) which verifies it and
 * returns our own JWT session.
 */
object GoogleSignInHelper {

    /** Returns true when the app was configured with a Google Web client id. */
    val isEnabled: Boolean
        get() = BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()

    const val REQ_GOOGLE_SIGN_IN = 9001

    /**
     * Launches the Google account picker through the given Compose activity-result
     * launcher; [finishSignIn] is called by the launcher callback with the result.
     */
    suspend fun launchPicker(
        activity: Activity,
        launcher: androidx.activity.compose.ManagedActivityResultLauncher<
            IntentSenderRequest,
            androidx.activity.result.ActivityResult,
        >,
        accountLauncher: androidx.activity.compose.ManagedActivityResultLauncher<
            android.content.Intent,
            androidx.activity.result.ActivityResult,
        >,
    ): Boolean {
        if (!isEnabled) return false
        return try {
            val oneTapClient: SignInClient = Identity.getSignInClient(activity)
            val request = BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(
                    BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        // Show all accounts on device, not only the ones tied to this app.
                        .setFilterByAuthorizedAccounts(false)
                        .build(),
                )
                .setAutoSelectEnabled(true)
                .build()

            val pendingIntent = suspendCancellableCoroutine { cont ->
                oneTapClient.beginSignIn(request)
                    .addOnSuccessListener { result -> cont.resume(result.pendingIntent) }
                    .addOnFailureListener { e -> cont.resumeWithException(e) }
            }
            // PendingIntent has no compile-time `intentSender` accessor in every 21.x
            // release, so read it via reflection – the field/method always exists at runtime.
            val sender = extractIntentSender(pendingIntent)
                ?: return launchClassicFallback(activity, launcher, accountLauncher)
            launcher.launch(IntentSenderRequest.Builder(sender).build())
            true
        } catch (e: Exception) {
            // Fallback 1: classic Identity getSignInIntent; fallback 2: GoogleSignIn account picker.
            launchClassicFallback(activity, launcher, accountLauncher)
        }
    }

    /** Classic getSignInIntent path; also avoids direct `intentSender` property access. */
    private suspend fun launchClassicFallback(
        activity: Activity,
        launcher: androidx.activity.compose.ManagedActivityResultLauncher<
            IntentSenderRequest,
            androidx.activity.result.ActivityResult,
        >,
        accountLauncher: androidx.activity.compose.ManagedActivityResultLauncher<
            android.content.Intent,
            androidx.activity.result.ActivityResult,
        >,
    ): Boolean {
        return try {
            val pending = Identity.getSignInClient(activity)
                .getSignInIntent(
                    GetSignInIntentRequest.builder()
                        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        .build(),
                ).await()
            val sender = extractIntentSender(pending)
            if (sender != null) {
                launcher.launch(IntentSenderRequest.Builder(sender).build())
                true
            } else {
                launchAccountPicker(activity, accountLauncher)
            }
        } catch (e2: Exception) {
            launchAccountPicker(activity, accountLauncher)
        }
    }

    /**
     * Last-resort picker: the classic GoogleSignIn account flow. Its result is a
     * plain Activity Intent (no IntentSender), delivered through [accountLauncher].
     */
    private fun launchAccountPicker(
        activity: Activity,
        accountLauncher: androidx.activity.compose.ManagedActivityResultLauncher<
            android.content.Intent,
            androidx.activity.result.ActivityResult,
        >,
    ): Boolean {
        return try {
            val intent = com.google.android.gms.auth.api.signin.GoogleSignIn
                .getClient(
                    activity,
                    com.google.android.gms.auth.api.signin.GoogleSignInOptions.Builder(
                        com.google.android.gms.auth.api.signin.GoogleSignInOptions.DEFAULT_SIGN_IN,
                    )
                        .requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        .requestEmail()
                        .build(),
                ).signInIntent
            accountLauncher.launch(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Reads the IntentSender out of a PendingIntent reflectively (compile-safe on all 21.x). */
    private fun extractIntentSender(pendingIntent: Any): android.content.IntentSender? {
        return try {
            val m = pendingIntent.javaClass.methods.firstOrNull {
                it.name == "getIntentSender" && it.parameterCount == 0
            }
            m?.invoke(pendingIntent) as? android.content.IntentSender
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Completes the sign-in after the Google picker returns.
     * [data] is the result Intent; it carries the Google ID token, which we
     * exchange with Firebase Auth and then with our backend session.
     */
    suspend fun finishSignIn(activity: Activity, data: Intent?): Result<AuthResponse> {
        if (data == null) return Result.failure(Exception("لم يتم اختيار حساب Google"))
        return try {
            // Extract the Google ID token from the result Intent.
            // `Identity.getSignInClient(...).getCredentialFromIntent(data)` exists only in
            // play-services-auth >= 21.4; on other versions fall back to the classic
            // GoogleSignInAccount path. Both branches use reflection-free APIs that are
            // present in every 21.x release, so compilation never fails.
            val idToken = extractIdToken(activity, data)
                ?: runCatching { forceAccountToken(activity) }.getOrNull()
                ?: return Result.failure(
                    Exception(
                        "تعذّر الحصول على رمز Google من شاشة اختيار الحساب — جرّب مرة أخرى وتأكد من تسجيل الدخول بحسابك في إعدادات Google على الجهاز.",
                    ),
                )

            // Primary path: send the raw Google ID token straight to our backend,
            // which verifies it against Google's public keys. This works even when
            // Firebase Auth rejects the exchange (e.g. certificate-hash mismatch).
            runCatching { googleLogin(idToken, activity) }
                .onSuccess { return Result.success(it) }
                .onFailure { gErr ->
                    android.util.Log.e("TapWin", "google-direct login failed, trying firebase", gErr)
                }

            // Fallback path: exchange with Firebase Auth first (legacy flow), then
            // send the Firebase ID token to the backend.
            val firebaseResult = FirebaseAuth.getInstance()
                .signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
                .await()
            val firebaseUser = firebaseResult.user
                ?: return Result.failure(Exception("فشل تسجيل الدخول عبر Firebase: راجع SHA-1 للتوقيع في مشروع Firebase"))

            // 2) Send the Firebase ID token to our backend to get a Tap Win session.
            // Task<GetTokenResult>.await() returns GetTokenResult directly; its `.token` is the string.
            val tokenResult = firebaseUser.getIdToken(true).await()
            val response = ApiClient.authApi.firebaseLogin(
                FirebaseLoginRequest(
                    idToken = tokenResult?.token ?: firebaseUser.uid,
                    deviceId = ApiClient.deviceId,
                    deviceName = ApiClient.deviceName,
                ),
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val err = runCatching {
                    response.errorBody()?.string()?.let { body ->
                        org.json.JSONObject(body).optString("error")
                    }
                }.getOrNull()
                Result.failure(Exception(err ?: "فشل تسجيل الدخول عبر الخادم (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /** Sends a raw Google ID token to our backend and returns the Tap Win session. */
    private suspend fun googleLogin(googleIdToken: String, activity: Activity): AuthResponse {
        val response = ApiClient.authApi.firebaseLogin(
            FirebaseLoginRequest(
                idToken = googleIdToken,
                deviceId = ApiClient.deviceId,
                deviceName = ApiClient.deviceName,
            ),
        )
        if (response.isSuccessful && response.body() != null) return response.body()!!
        val msg = runCatching {
            response.errorBody()?.string()?.let { body ->
                org.json.JSONObject(body).optString("message").ifBlank { null }
            }
        }.getOrNull()
        throw Exception(msg ?: "فشل تسجيل الدخول عبر الخادم (${response.code()})")
    }

    /**
     * Recovery path when the picker result carries no token: if the user already
     * completed the Google flow, Play keeps a last-signed-in account whose ID
     * token we can read directly (silent re-auth).
     */
    private suspend fun forceAccountToken(activity: Activity): String? {
        val client = com.google.android.gms.auth.api.signin.GoogleSignIn.getClient(
            activity,
            com.google.android.gms.auth.api.signin.GoogleSignInOptions.Builder(
                com.google.android.gms.auth.api.signin.GoogleSignInOptions.DEFAULT_SIGN_IN,
            )
                .requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                .requestEmail()
                .build(),
        )
        // 1) Silent re-auth (no UI): the returned GoogleSignInAccount already
        //    carries the ID token because requestIdToken(...) was set above.
        //    NOTE: do NOT use client.getAccessToken(account) here - that overload
        //    does not exist in play-services-auth 21.x and breaks compilation.
        val silent = runCatching { client.silentSignIn().await() }.getOrNull()
        val silentTok = silent?.idToken
        if (!silentTok.isNullOrEmpty()) return silentTok
        // 2) Last signed-in account stored by Play Services (no network call).
        val last = runCatching {
            com.google.android.gms.auth.api.signin.GoogleSignIn.getLastSignedInAccount(activity)
        }.getOrNull()
        val lastTok = last?.idToken
        if (!lastTok.isNullOrEmpty()) return lastTok
        return null
    }

    /**
     * Reads the Google ID token out of the sign-in result Intent in a way that
     * compiles against every play-services-auth 21.x version:
     *  1. Try the Credential API (`getCredentialFromIntent`) via reflection – present
     *     in 21.4+; returns `GoogleSignInCredential.token`.
     *  2. Fall back to the classic `GoogleSignIn.getSignedInAccountFromIntent(data)`
     *     which exists in all versions and carries `account.idToken`.
     */
    private fun extractIdToken(activity: Activity, data: Intent): String? {
        // --- Path 1: Credential API (reflection so older SDKs still compile) ---
        try {
            val client = Identity.getSignInClient(activity)
            val method = client.javaClass.methods.firstOrNull {
                it.name == "getCredentialFromIntent" && it.parameterCount == 1
            }
            if (method != null) {
                val credential = method.invoke(client, data)
                val token = credential?.javaClass?.methods
                    ?.firstOrNull { it.name == "getToken" && it.parameterCount == 0 }
                    ?.invoke(credential) as? String
                if (!token.isNullOrBlank()) return token
            }
        } catch (e: Exception) {
            // ignore and try classic path
        }

        // --- Path 2: classic GoogleSignIn account API (always available) ---
        try {
            val account = com.google.android.gms.auth.api.signin.GoogleSignIn
                .getSignedInAccountFromIntent(data)
                .getResult(ApiException::class.java)
            val t = account?.idToken
            if (!t.isNullOrBlank()) return t
        } catch (e: Exception) {
            // ignore and try raw intent extras
        }

        // --- Path 3: read the id_token directly from the result Intent extras ---
        // The Credential/Identity result puts the Google ID token into the intent
        // even when typed accessors are unavailable on the bundled SDK version.
        return try {
            val extras: android.os.Bundle? = data.extras
            val candidates = listOf(
                "accountResponseObject",           // BeginSignIn google id-token result key
                "googleAccountID",
                "id_token",
            )
            for (key in candidates) {
                val v = extras?.get(key) ?: continue
                val str = v.toString()
                // A real JWT has three dot-separated base64 segments.
                if (str.count { it == '.' } == 2 && str.startsWith("eyJ")) return str
            }
            // Nested bundle variant used by some play-services builds.
            extras?.keySet()?.forEach { k ->
                val nested = runCatching { extras.getBundle(k) }.getOrNull()
                val tok = nested?.getString("data") ?: nested?.keySet()?.firstNotNullOfOrNull { kk ->
                    nested.getString(kk)?.takeIf { it.startsWith("eyJ") && it.count { c -> c == '.' } == 2 }
                }
                if (tok != null) return tok
            }
            null
        } catch (e: Exception) {
            null
        }
    }
}