package com.myapp.android.api

import android.content.Context
import android.provider.Settings
import com.myapp.android.BuildConfig
import com.myapp.android.data.SessionStore
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    val deviceId: String by lazy {
        Settings.Secure.getString(
            AppContextHolder.context.contentResolver,
            Settings.Secure.ANDROID_ID,
        ) ?: "android-unknown"
    }

    val deviceName: String by lazy {
        "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
    }

    private val session = SessionStore(AppContextHolder.context)

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val token = session.accessToken
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
