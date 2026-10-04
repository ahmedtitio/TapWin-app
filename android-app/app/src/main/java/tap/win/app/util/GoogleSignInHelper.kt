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
                ?: return launchClassicFallback(activity, launcher)
            launcher.launch(IntentSenderRequest.Builder(sender).build())
            true
        } catch (e: Exception) {
            // Fallback: classic Google sign-in Intent (works with any play-services-auth version)
            launchClassicFallback(activity, launcher)
        }
    }

    /** Classic getSignInIntent path; also avoids direct `intentSender` property access. */
    private suspend fun launchClassicFallback(
        activity: Activity,
        launcher: androidx.activity.compose.ManagedActivityResultLauncher<
            IntentSenderRequest,
            androidx.activity.result.ActivityResult,
        >,
    ): Boolean = try {
        val pending = Identity.getSignInClient(activity)
            .getSignInIntent(
                GetSignInIntentRequest.builder()
                    .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                    .build(),
            ).await()
        val sender = extractIntentSender(pending) ?: return false
        launcher.launch(IntentSenderRequest.Builder(sender).build())
        true
    } catch (e2: Exception) {
        false
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
                ?: return Result.failure(Exception("تعذّر الحصول على رمز Google"))

            // 1) Exchange the Google ID token for a Firebase user.
            val firebaseResult = FirebaseAuth.getInstance()
                .signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
                .await()
            val firebaseUser = firebaseResult.user
                ?: return Result.failure(Exception("فشل تسجيل الدخول عبر Firebase"))

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
        return try {
            val task = com.google.android.gms.auth.api.signin.GoogleSignIn
                .getSignedInAccountFromIntent(data)
            val account = (task as com.google.android.gms.tasks.Task<*>)
                .getResult(ApiException::class.java)
                as? com.google.android.gms.auth.api.signin.GoogleSignInAccount
            account?.idToken
        } catch (e: Exception) {
            null
        }
    }
}
