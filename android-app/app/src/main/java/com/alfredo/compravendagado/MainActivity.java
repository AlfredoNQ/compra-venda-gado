package com.alfredo.compravendagado;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.ContentValues;
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
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String HOME = "https://compra-venda-gado-app.pages.dev/";
    private static final String HOME_HOST = "compra-venda-gado-app.pages.dev";
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
        s.setUserAgentString(s.getUserAgentString() + " CompraVendaGadoApp/182");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.addJavascriptInterface(new AndroidDownloads(), "AndroidDownloads");

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("blob:") || isTrustedUrl(Uri.parse(url))) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch(Exception ignored) {}
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view,url);
                installBlobDownloadBridge();
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return isOnline() ? super.shouldInterceptRequest(view,request) : offlineResponse(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return isOnline() ? super.shouldInterceptRequest(view,url) : offlineResponse(Uri.parse(url));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = params.createIntent();
                try { startActivityForResult(i, FILE_CHOOSER); return true; }
                catch(Exception e) { fileCallback = null; return false; }
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) callback.invoke(origin,true,false);
                else { requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION}, PERMISSIONS); callback.invoke(origin,true,false); }
            }
        });
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.startsWith("blob:")) { downloadBlob(url, contentDisposition, mimeType); return; }
            try {
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                r.addRequestHeader("User-Agent", userAgent);
                r.setMimeType(mimeType);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this,"Download iniciado",Toast.LENGTH_SHORT).show();
            } catch(Exception e) { Toast.makeText(this,"Nao foi possivel baixar o arquivo",Toast.LENGTH_LONG).show(); }
        });
        if (savedInstanceState == null) web.loadUrl(HOME); else web.restoreState(savedInstanceState);
    }

    private void installBlobDownloadBridge() {
        web.evaluateJavascript("(function(){if(window.__cvBlobBridge)return;window.__cvBlobBridge=true;document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[download]');if(!a||!a.href||a.href.indexOf('blob:')!==0)return;e.preventDefault();var u=a.href,n=a.getAttribute('download')||'backup-compra-venda-gado.json';fetch(u).then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();fr.onloadend=function(){AndroidDownloads.saveBase64(fr.result,n,b.type||'application/octet-stream')};fr.readAsDataURL(b)}).catch(function(){AndroidDownloads.error()});},true)})()", null);
    }

    private void downloadBlob(String url, String contentDisposition, String mimeType) {
        String name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
        String js = "fetch(" + org.json.JSONObject.quote(url) + ").then(r=>r.blob()).then(b=>{let f=new FileReader();f.onloadend=()=>AndroidDownloads.saveBase64(f.result," + org.json.JSONObject.quote(name) + ",b.type||" + org.json.JSONObject.quote(mimeType == null ? "application/octet-stream" : mimeType) + ");f.readAsDataURL(b)}).catch(()=>AndroidDownloads.error())";
        web.evaluateJavascript(js,null);
    }

        public class AndroidDownloads {
        @JavascriptInterface public void saveBase64(String dataUrl, String fileName, String mime) {
            try {
                int comma=dataUrl.indexOf(',');
                String payload=comma>=0?dataUrl.substring(comma+1):dataUrl;
                byte[] bytes=Base64.decode(payload,Base64.DEFAULT);
                String safe=(fileName==null||fileName.trim().isEmpty())?"backup-compra-venda-gado.json":fileName.replaceAll("[\\\\/:*?\"<>|]","_");
                if (android.os.Build.VERSION.SDK_INT >= 29) {
                    ContentValues values=new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME,safe);
                    values.put(MediaStore.Downloads.MIME_TYPE,mime==null?"application/octet-stream":mime);
                    values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.Downloads.IS_PENDING,1);
                    Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
                    if(uri==null)throw new java.io.IOException("Não foi possível criar o arquivo");
                    try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new java.io.IOException("Não foi possível abrir o arquivo");out.write(bytes);out.flush();}
                    ContentValues done=new ContentValues();done.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,done,null,null);
                } else {
                    File dir=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if(!dir.exists())dir.mkdirs();
                    File out=new File(dir,safe);
                    try(FileOutputStream fos=new FileOutputStream(out)){fos.write(bytes);fos.flush();}
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this,"Backup salvo em Downloads: "+safe,Toast.LENGTH_LONG).show());
            } catch(Exception e) { error(); }
        }
        @JavascriptInterface public void error() { runOnUiThread(() -> Toast.makeText(MainActivity.this,"Falha ao gerar o backup no APK",Toast.LENGTH_LONG).show()); }
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n=cm.getActiveNetwork(); if(n==null)return false;
            NetworkCapabilities c=cm.getNetworkCapabilities(n);
            return c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        } catch(Exception e){return false;}
    }

    private boolean isTrustedUrl(Uri uri) {
        if(uri==null)return false;
        String scheme=uri.getScheme()==null?"":uri.getScheme();
        String host=uri.getHost()==null?"":uri.getHost();
        return ("https".equalsIgnoreCase(scheme) && HOME_HOST.equalsIgnoreCase(host));
    }

    private WebResourceResponse offlineResponse(Uri uri) {
        try {
            String host=uri.getHost()==null?"":uri.getHost();
            String path=uri.getPath()==null?"/":uri.getPath();
            if("cdn.jsdelivr.net".equals(host) && path.contains("supabase")) return new WebResourceResponse("application/javascript","UTF-8",getAssets().open("site/supabase.js"));
            if(!HOME_HOST.equals(host)) return null;
            if(path.equals("/")||path.isEmpty())path="/index.html";
            if(path.startsWith("/"))path=path.substring(1);
            if(path.contains(".."))return null;
            InputStream in=getAssets().open("site/"+path);
            String ext=MimeTypeMap.getFileExtensionFromUrl(path);
            String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if(mime==null){ if(path.endsWith(".js"))mime="application/javascript"; else if(path.endsWith(".css"))mime="text/css"; else if(path.endsWith(".html"))mime="text/html"; else if(path.endsWith(".json")||path.endsWith(".webmanifest"))mime="application/json"; else mime="application/octet-stream"; }
            return new WebResourceResponse(mime,"UTF-8",in);
        } catch(Exception e){return null;}
    }

    @Override protected void onSaveInstanceState(Bundle outState) { web.saveState(outState); super.onSaveInstanceState(outState); }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            Uri[] result = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode,data) : null;
            fileCallback.onReceiveValue(result); fileCallback = null;
        }
    }
}
