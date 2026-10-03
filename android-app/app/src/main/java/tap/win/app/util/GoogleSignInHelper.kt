package tap.win.app.util

import android.app.Activity
import androidx.activity.result.IntentSenderRequest
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
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
 * Flow: Credential Manager asks Google for an ID token (using the Web OAuth
 * client id from BuildConfig.GOOGLE_WEB_CLIENT_ID, which is injected by Codemagic
 * / gradle.properties), we exchange it with Firebase Auth, then send the
 * Firebase ID token to our backend (`POST api/auth/firebase`) which verifies
 * it and returns our own JWT session.
 */
object GoogleSignInHelper {

    /** Returns true when the app was configured with a Google Web client id. */
    val isEnabled: Boolean
        get() = BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()

    /**
     * Launches the Google account picker through the given Compose activity-result
     * launcher; [finishSignIn] is called by the launcher callback with the result.
     */
    suspend fun launchPicker(
        activity: Activity,
        launcher: androidx.activity.compose.ManagedActivityResultLauncher<IntentSenderRequest, androidx.activity.result.IntentSenderRequest>,
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
                .setAutoCancelEnabled(true)
                .build()

            val pendingResult = suspendCancellableCoroutine { cont ->
                oneTapClient.beginSignIn(request)
                    .addOnSuccessListener { result -> cont.resume(result) }
                    .addOnFailureListener { e -> cont.resumeWithException(e) }
                cont.invokeOnCancellation { oneTapClient.cancelSignIn() }
            }
            launcher.launch(
                IntentSenderRequest.Builder(pendingResult.pendingIntent.intentSender).build(),
            )
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Completes the sign-in after the Google picker returns.
     * [data] is the IntentSender result Intent; it carries the Google ID token,
     * which we exchange with Firebase Auth and then with our backend session.
     */
    suspend fun finishSignIn(activity: Activity, data: android.content.Intent?): Result<AuthResponse> {
        if (data == null) return Result.failure(Exception("لم يتم اختيار حساب Google"))
        return try {
            val credential = Identity.getSignInClient(activity)
                .getCredentialFromIntent(data)
            val idToken = credential?.idToken
                ?: return Result.failure(Exception("تعذّر الحصول على رمز Google"))

            // 1) Exchange the Google ID token for a Firebase user.
            val firebaseUser = suspendCancellableCoroutine { cont ->
                FirebaseAuth.getInstance()
                    .signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
                    .addOnSuccessListener { result -> cont.resume(result.user!!) }
                    .addOnFailureListener { e -> cont.resumeWithException(e) }
            }

            // 2) Send the Firebase ID token to our backend to get a Tap Win session.
            val firebaseToken = firebaseUser.getIdToken(true).await()
            val response = ApiClient.authApi.firebaseLogin(
                FirebaseLoginRequest(
                    idToken = firebaseToken.token!!,
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

    companion object {
        const val REQ_GOOGLE_SIGN_IN = 9001
    }
}
