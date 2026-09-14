package com.aniwavex.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Override WebViewClient after Capacitor bridge is initialized.
        // This intercepts ALL URL navigations and keeps aniwavex.bond inside the app.
        this.getBridge().getWebView().setWebViewClient(new WebViewClient() {
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
