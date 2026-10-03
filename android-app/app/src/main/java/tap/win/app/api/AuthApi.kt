package tap.win.app.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.*

data class User(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val username: String,
    val email: String,
    val phone: String?,
    val role: String,
    @SerializedName("avatar_url") val avatarUrl: String?,
    @SerializedName("last_login_at") val lastLoginAt: String?,
)

data class Tokens(
    val accessToken: String,
    val refreshToken: String,
)

data class AuthResponse(
    val user: User,
    val tokens: Tokens,
)

data class LoginRequest(
    val email: String,
    val password: String,
    val audience: String = "app",
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    val platform: String = "android",
)

data class RegisterRequest(
    @SerializedName("full_name") val fullName: String,
    val username: String,
    val email: String,
    val phone: String? = null,
    val password: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    val platform: String = "android",
)

data class ForgotRequest(val email: String)

data class ResetRequest(
    val token: String,
    @SerializedName("new_password") val newPassword: String,
)

data class RefreshRequest(@SerializedName("refresh_token") val refreshToken: String)

data class HeartbeatRequest(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    val platform: String = "android",
)

data class FirebaseLoginRequest(
    @SerializedName("id_token") val idToken: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String,
    val platform: String = "android",
)

data class EventRequest(
    val event: String,
    val props: org.json.JSONObject? = null,
)

data class ApiError(
    val error: String?,
    val message: String?,
)

interface AuthApi {
    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): retrofit2.Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): retrofit2.Response<AuthResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotRequest): retrofit2.Response<Unit>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body body: ResetRequest): retrofit2.Response<Unit>

    @POST("api/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): retrofit2.Response<AuthResponse>

    @POST("api/auth/logout")
    suspend fun logout(@Header("Authorization") auth: String): retrofit2.Response<Unit>

    @POST("api/auth/firebase")
    suspend fun firebaseLogin(@Body body: FirebaseLoginRequest): retrofit2.Response<AuthResponse>

    @POST("api/auth/heartbeat")
    suspend fun heartbeat(
        @Header("Authorization") auth: String,
        @Body body: HeartbeatRequest,
    ): retrofit2.Response<Unit>

    @POST("api/auth/event")
    suspend fun trackEvent(@Body body: EventRequest): retrofit2.Response<Unit>

    @GET("api/auth/me")
    suspend fun me(@Header("Authorization") auth: String): retrofit2.Response<User>

    @PATCH("api/auth/me")
    suspend fun updateMe(
        @Header("Authorization") auth: String,
        @Body body: Map<String, String>,
    ): retrofit2.Response<User>

    @POST("api/auth/change-password")
    suspend fun changePassword(
        @Header("Authorization") auth: String,
        @Body body: Map<String, String>,
    ): retrofit2.Response<Unit>
}
