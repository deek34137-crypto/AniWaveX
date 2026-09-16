package com.aniwavex.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Append custom token to UserAgent so web application knows it is running inside the APK
        WebView webView = this.getBridge().getWebView();
        String currentUa = webView.getSettings().getUserAgentString();
        if (currentUa != null && !currentUa.contains("AniWaveX-APK")) {
            webView.getSettings().setUserAgentString(currentUa + " AniWaveX-APK");
        }

        // Extend BridgeWebViewClient after Capacitor bridge is initialized.
        // This intercepts external navigations while preserving all Capacitor bridge functionality.
        webView.setWebViewClient(new BridgeWebViewClient(this.getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                String scheme = uri.getScheme();

                if (scheme == null) return false;

                // Keep aniwavex.bond and all its pages inside the WebView
                if ("aniwavex.bond".equals(host) ||
                    (host != null && host.endsWith(".aniwavex.bond")) ||
                    "localhost".equals(host)) {
                    return false; // Let Capacitor WebView handle it
                }

                // Keep Capacitor internal schemes in-app
                if ("capacitor".equals(scheme) || "ionic".equals(scheme)) {
                    return false;
                }

                // All external URLs → open in Chrome or default browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {}
                return true; // We handled it, block WebView from loading it
            }
        });
    }
}
