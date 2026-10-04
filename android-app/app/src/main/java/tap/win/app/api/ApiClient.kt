package tap.win.app.api

import android.content.Context
import android.provider.Settings
import tap.win.app.BuildConfig
import tap.win.app.data.SessionStore
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    val deviceId: String by lazy {
        runCatching {
            Settings.Secure.getString(
                AppContextHolder.context.contentResolver,
                Settings.Secure.ANDROID_ID,
            )
        }.getOrNull() ?: "android-unknown"
    }

    val deviceName: String by lazy {
        "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
    }

    // Lazy + guarded: constructing EncryptedSharedPreferences can throw on some
    // devices (e.g. AndroidKeyStore glitches); doing it eagerly at class-init
    // used to crash the app on launch before any UI was shown.
    private val session: SessionStore? by lazy {
        runCatching { SessionStore(AppContextHolder.context) }.getOrNull()
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = session?.accessToken
        val request = if (token != null && !original.url.encodedPath.contains("/auth/refresh")) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else original
        chain.proceed(request)
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        })
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
}

object AppContextHolder {
    lateinit var context: Context
}
