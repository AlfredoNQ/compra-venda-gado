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
import java.nio.charset.StandardCharsets;

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
        s.setUserAgentString(s.getUserAgentString() + " CompraVendaGadoApp/112");

        web.addJavascriptInterface(new PdfBridge(), "AndroidPdf");
        web.addJavascriptInterface(new DownloadBridge(), "AndroidDownloads");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch(Exception ignored) {}
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                    "(function(){try{"+
                    "var h=document.querySelector('header h1')||document.querySelector('h1');"+
                    "if(h){var spans=h.querySelectorAll('span');for(var i=0;i<spans.length;i++){var t=(spans[i].textContent||'').trim();if(/^v\\d+$/i.test(t)){spans[i].textContent='v112';break;}}"+
                    "var b=document.getElementById('androidAppVersionBadge');if(!b){b=document.createElement('span');b.id='androidAppVersionBadge';h.appendChild(b);}b.textContent='APP v112';b.style.cssText='display:inline-block;margin-left:8px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.16);color:inherit;font-size:10px;font-weight:900;vertical-align:middle;white-space:nowrap';}"+
                    "window.openStoredPdfV85=function(id){try{var d=(window.__pdfDocsV85||{})[id];if(!d||!d.data){alert('Documento não encontrado');return;}if(window.AndroidPdf&&typeof window.AndroidPdf.openPdf==='function'){window.AndroidPdf.openPdf(d.data,d.name||'documento.pdf');return;}alert('Ponte PDF do aplicativo indisponível');}catch(e){alert('Erro ao abrir PDF: '+e.message);}};"+
                    "window.download=function(name,text,type){try{if(window.AndroidDownloads&&typeof window.AndroidDownloads.saveText==='function'){window.AndroidDownloads.saveText(String(text==null?'':text),String(name||'arquivo.txt'),String(type||'text/plain;charset=utf-8'));return;}throw new Error('ponte Android indisponível');}catch(e){alert('Falha ao salvar arquivo: '+e.message);}};"+
                    "}catch(e){console.log('v112 inject',e);}})();", null
                );
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local=offlineResponse(request.getUrl()); if(local!=null)return local; return super.shouldInterceptRequest(view, request);
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse local=offlineResponse(Uri.parse(url)); if(local!=null)return local; return super.shouldInterceptRequest(view, url);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try { startActivityForResult(params.createIntent(), FILE_CHOOSER); return true; }
                catch(Exception e) { fileCallback = null; return false; }
            }

            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) callback.invoke(origin,true,false);
                else { requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},PERMISSIONS); callback.invoke(origin,true,false); }
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                if(url!=null && url.startsWith("blob:")) {
                    Toast.makeText(this,"Use os botões Backup sistema ou Backup Excel",Toast.LENGTH_SHORT).show();
                    return;
                }
                DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                r.addRequestHeader("User-Agent", userAgent);
                r.setMimeType(mimeType);
                r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String name=android.webkit.URLUtil.guessFileName(url,contentDisposition,mimeType);
                r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,name);
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(r);
                Toast.makeText(this,"Download iniciado",Toast.LENGTH_SHORT).show();
            } catch(Exception e) { Toast.makeText(this,"Não foi possível baixar o arquivo",Toast.LENGTH_LONG).show(); }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME + "/?app=v112");
    }

    private Uri saveBytes(byte[] bytes,String fileName,String mimeType) throws Exception {
        String safe=(fileName==null||fileName.trim().isEmpty())?"arquivo":fileName.replaceAll("[\\\\/:*?\"<>|]","_");
        ContentValues values=new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME,safe);
        values.put(MediaStore.Downloads.MIME_TYPE,(mimeType==null||mimeType.isEmpty())?"application/octet-stream":mimeType.split(";")[0]);
        values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/CompraVendaGado");
        Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
        if(uri==null)throw new Exception("não foi possível criar arquivo");
        try(OutputStream out=getContentResolver().openOutputStream(uri)){
            if(out==null)throw new Exception("não foi possível gravar arquivo");
            out.write(bytes); out.flush();
        }
        return uri;
    }

    public class DownloadBridge {
        @JavascriptInterface public void saveText(String text,String fileName,String mimeType){
            runOnUiThread(() -> {
                try {
                    byte[] bytes=(text==null?"":text).getBytes(StandardCharsets.UTF_8);
                    saveBytes(bytes,fileName,mimeType);
                    Toast.makeText(MainActivity.this,"Arquivo salvo em Downloads/CompraVendaGado: "+fileName,Toast.LENGTH_LONG).show();
                }catch(Exception e){ Toast.makeText(MainActivity.this,"Erro ao salvar arquivo: "+e.getMessage(),Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void saveBase64(String dataUrl,String fileName,String mimeType){
            runOnUiThread(() -> {
                try {
                    int comma=dataUrl==null?-1:dataUrl.indexOf(',');
                    if(comma<0)throw new Exception("arquivo inválido");
                    byte[] bytes=Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                    saveBytes(bytes,fileName,mimeType);
                    Toast.makeText(MainActivity.this,"Arquivo salvo em Downloads/CompraVendaGado",Toast.LENGTH_LONG).show();
                }catch(Exception e){ Toast.makeText(MainActivity.this,"Erro ao salvar arquivo: "+e.getMessage(),Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void error(String msg){ runOnUiThread(() -> Toast.makeText(MainActivity.this,msg==null?"Falha ao gerar arquivo":msg,Toast.LENGTH_LONG).show()); }
    }

    public class PdfBridge {
        @JavascriptInterface public void openPdf(String dataUrl, String fileName) {
            runOnUiThread(() -> {
                try {
                    int comma=dataUrl.indexOf(','); if(comma<0)throw new Exception("PDF inválido");
                    byte[] bytes=Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                    String safe=(fileName==null||fileName.trim().isEmpty())?"documento.pdf":fileName.replaceAll("[^a-zA-Z0-9._-]","_");
                    if(!safe.toLowerCase().endsWith(".pdf"))safe+=".pdf";
                    Uri uri=saveBytes(bytes,safe,"application/pdf");
                    Intent intent=new Intent(Intent.ACTION_VIEW); intent.setDataAndType(uri,"application/pdf"); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try{ startActivity(Intent.createChooser(intent,"Abrir PDF com")); }
                    catch(Exception noViewer){ Toast.makeText(MainActivity.this,"PDF salvo em Downloads/CompraVendaGado",Toast.LENGTH_LONG).show(); }
                }catch(Exception e){ Toast.makeText(MainActivity.this,"Erro ao abrir PDF: "+e.getMessage(),Toast.LENGTH_LONG).show(); }
            });
        }
    }

    private boolean isOnline() {
        try { ConnectivityManager cm=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE); Network n=cm.getActiveNetwork(); if(n==null)return false; NetworkCapabilities c=cm.getNetworkCapabilities(n); return c!=null&&c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED); }
        catch(Exception e){return false;}
    }

    private WebResourceResponse offlineResponse(Uri uri) {
        try {
            String host=uri.getHost()==null?"":uri.getHost(); String path=uri.getPath()==null?"/":uri.getPath();
            if("cdn.jsdelivr.net".equals(host)&&path.contains("supabase"))return new WebResourceResponse("application/javascript","UTF-8",getAssets().open("site/supabase.js"));
            if(!HOME_HOST.equals(host))return null;
            if(path.equals("/")||path.isEmpty())path="/index.html"; if(path.startsWith("/"))path=path.substring(1); if(path.contains(".."))return null;
            InputStream in=getAssets().open("site/"+path); String ext=MimeTypeMap.getFileExtensionFromUrl(path); String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if(mime==null){ if(path.endsWith(".js"))mime="application/javascript"; else if(path.endsWith(".css"))mime="text/css"; else if(path.endsWith(".html"))mime="text/html"; else if(path.endsWith(".json")||path.endsWith(".webmanifest"))mime="application/json"; else mime="application/octet-stream"; }
            return new WebResourceResponse(mime,"UTF-8",in);
        }catch(Exception e){return null;}
    }

    @Override protected void onSaveInstanceState(Bundle outState){ web.saveState(outState); super.onSaveInstanceState(outState); }
    @Override public void onBackPressed(){ if(web!=null&&web.canGoBack())web.goBack(); else super.onBackPressed(); }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){ super.onActivityResult(requestCode,resultCode,data); if(requestCode==FILE_CHOOSER&&fileCallback!=null){ Uri[] result=resultCode==RESULT_OK?WebChromeClient.FileChooserParams.parseResult(resultCode,data):null; fileCallback.onReceiveValue(result); fileCallback=null; } }
}
