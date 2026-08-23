package com.alfredo.compravendagado;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String HOME = "https://compra-venda-gado.vercel.app";
    private static final String HOME_HOST = "compra-venda-gado.vercel.app";
    private static final int FILE_CHOOSER = 1001;
    private static final int PERMISSIONS = 1002;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " CompraVendaGadoApp/85");

        web.addJavascriptInterface(new PdfBridge(), "AndroidPdf");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch(Exception ignored) {}
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                    "(function(){try{"+
                    "var h=document.querySelector('header h1')||document.querySelector('h1');"+
                    "if(h){var b=document.getElementById('androidAppVersionBadge');"+
                    "if(!b){b=document.createElement('span');b.id='androidAppVersionBadge';h.appendChild(b);}"+
                    "b.textContent='APP v85';"+
                    "b.style.cssText='display:inline-block;margin-left:8px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);color:inherit;font-size:10px;font-weight:900;vertical-align:middle;white-space:nowrap';}"+
                    "}catch(e){}})();", null
                );
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return isOnline() ? super.shouldInterceptRequest(view, request) : offlineResponse(request.getUrl());
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return isOnline() ? super.shouldInterceptRequest(view, url) : offlineResponse(Uri.parse(url));
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER);
                    return true;
                } catch(Exception e) {
                    fileCallback = null;
                    return false;
                }
            }

            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin,true,false);
                } else {
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},PERMISSIONS);
                    callback.invoke(origin,true,false);
                }
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                r.addRequestHeader("User-Agent", userAgent);
                r.setMimeType(mimeType);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,"compra-venda-gado-arquivo");
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this,"Download iniciado",Toast.LENGTH_SHORT).show();
            } catch(Exception e) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch(Exception ignored) {}
            }
        });

        if (isOnline()) openOnlineWithFreshLogin();
        else if (savedInstanceState == null) web.loadUrl(HOME);
        else web.restoreState(savedInstanceState);
    }

    public class PdfBridge {
        @JavascriptInterface
        public void openPdf(String dataUrl, String fileName) {
            runOnUiThread(() -> {
                try {
                    int comma = dataUrl.indexOf(',');
                    if (comma < 0) throw new Exception("PDF inválido");
                    byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                    String safe = (fileName == null || fileName.trim().isEmpty()) ? "documento.pdf" : fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
                    if (!safe.toLowerCase().endsWith(".pdf")) safe += ".pdf";

                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/CompraVendaGado");
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new Exception("Não foi possível criar o arquivo");
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new Exception("Não foi possível gravar o PDF");
                        out.write(bytes);
                        out.flush();
                    }

                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try {
                        startActivity(intent);
                    } catch(Exception noViewer) {
                        Toast.makeText(MainActivity.this,"PDF salvo em Downloads/CompraVendaGado",Toast.LENGTH_LONG).show();
                    }
                } catch(Exception e) {
                    Toast.makeText(MainActivity.this,"Erro ao abrir PDF: "+e.getMessage(),Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    private void openOnlineWithFreshLogin() {
        String bootstrap =
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"+
            "<style>body{margin:0;background:#eef3ef;font-family:Arial,sans-serif}.box{display:flex;min-height:100vh;align-items:center;justify-content:center;color:#17633f;font-weight:700}</style></head><body>"+
            "<div class='box'>Protegendo acesso...</div><script>(function(){try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i)||'';if(/^sb-.*-auth-token$/i.test(k)||k.indexOf('supabase.auth.token')>=0){localStorage.removeItem(k);}}}catch(e){}location.replace('/?app=v85&login=1&t='+Date.now());})();</script></body></html>";
        web.loadDataWithBaseURL(HOME + "/", bootstrap, "text/html", "UTF-8", null);
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n=cm.getActiveNetwork();
            if(n==null)return false;
            NetworkCapabilities c=cm.getNetworkCapabilities(n);
            return c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        } catch(Exception e){return false;}
    }

    private WebResourceResponse offlineResponse(Uri uri) {
        try {
            String host=uri.getHost()==null?"":uri.getHost();
            String path=uri.getPath()==null?"/":uri.getPath();
            if("cdn.jsdelivr.net".equals(host) && path.contains("supabase"))
                return new WebResourceResponse("application/javascript","UTF-8",getAssets().open("site/supabase.js"));
            if(!HOME_HOST.equals(host)) return null;
            if(path.equals("/")||path.isEmpty())path="/index.html";
            if(path.startsWith("/"))path=path.substring(1);
            if(path.contains(".."))return null;
            InputStream in=getAssets().open("site/"+path);
            String ext=MimeTypeMap.getFileExtensionFromUrl(path);
            String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if(mime==null){
                if(path.endsWith(".js"))mime="application/javascript";
                else if(path.endsWith(".css"))mime="text/css";
                else if(path.endsWith(".html"))mime="text/html";
                else if(path.endsWith(".json")||path.endsWith(".webmanifest"))mime="application/json";
                else mime="application/octet-stream";
            }
            return new WebResourceResponse(mime,"UTF-8",in);
        } catch(Exception e){return null;}
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        web.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            Uri[] result = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode,data) : null;
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }
}
