package tap.win.app.util

import android.app.Activity
import androidx.activity.result.IntentSenderRequest
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
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

    companion object {
        const val REQ_GOOGLE_SIGN_IN = 9001
    }
}
