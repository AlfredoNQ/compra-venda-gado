package com.alfredo.compravendagado;

import android.test.ActivityInstrumentationTestCase2;
import android.webkit.WebView;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Runs on an emulator with Wi-Fi and cellular data disabled. Uses test data only. */
public class OfflineTest extends ActivityInstrumentationTestCase2<MainActivity> {
    private WebView web;

    public OfflineTest() { super(MainActivity.class); }

    private String js(String expression) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        getInstrumentation().runOnMainSync(() -> web.evaluateJavascript(expression, result -> {
            value.set(result);
            done.countDown();
        }));
        assertTrue("JavaScript callback", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    private void waitFor(String expression) throws Exception {
        for (int i = 0; i < 150; i++) {
            if ("true".equals(js(expression))) return;
            Thread.sleep(100);
        }
        fail("Timed out: " + expression + "; value=" + js(expression) + "; page=" + js("JSON.stringify({url:location.href,state:document.readyState,title:document.title,body:document.body&&document.body.innerText.slice(0,1000),offline:typeof openOfflineApp,supabase:typeof supabase,leaflet:typeof L})"));
    }

    private void reload() throws Exception {
        js("window.__offlineTestOldPage=true;location.reload()");
        waitFor("!window.__offlineTestOldPage && document.readyState==='complete' && typeof openOfflineApp==='function'");
    }

    public void testOfflineBootSaveIsolationAndLogout() throws Exception {
        MainActivity activity = getActivity();
        Field field = MainActivity.class.getDeclaredField("web");
        field.setAccessible(true);
        web = (WebView) field.get(activity);
        waitFor("document.readyState==='complete' && typeof openOfflineApp==='function'");
        assertEquals("false", js("navigator.onLine"));
        assertEquals("true", js("typeof supabase==='object' && typeof L==='object' && typeof renderAll==='function'"));
        assertEquals("true", js("document.getElementById('appShell').style.display==='none'"));
        js("localStorage.clear();rememberAuthenticatedUser({id:'offline-test-user'});localStorage.setItem('controle_gado_v2_records__u_offline-test-user',JSON.stringify([{id:'offline-record',data:'2026-10-21',vendedor:'TESTE OFFLINE',quantCompra:10,quantVenda:0,precoCompra:100}]));");
        reload();
        waitFor("document.getElementById('appShell').style.display!=='none'");
        assertEquals("true", js("records.length===1 && records[0].id==='offline-record' && userStorageSuffix()==='__u_offline-test-user'"));
        js("records[0].observacoes='SALVO SEM INTERNET';persist()");
        assertEquals("true", js("isOfflineDirty()"));
        reload();
        waitFor("document.getElementById('appShell').style.display!=='none'");
        assertEquals("true", js("records[0].observacoes==='SALVO SEM INTERNET' && isOfflineDirty()"));
        // A grant for a different account must never open the saved user's data.
        js("localStorage.setItem('gado_offline_auth_v1',JSON.stringify({ok:true,userId:'different-user'}))");
        reload();
        assertEquals("true", js("document.getElementById('appShell').style.display==='none'"));
        js("rememberAuthenticatedUser({id:'offline-test-user'});openOfflineApp();cloudLogout()");
        waitFor("localStorage.getItem('gado_offline_auth_v1')===null && document.getElementById('appShell').style.display==='none'");
        reload();
        assertEquals("true", js("document.getElementById('appShell').style.display==='none'"));
        assertEquals("true", js("JSON.parse(localStorage.getItem('controle_gado_v2_records__u_offline-test-user'))[0].observacoes==='SALVO SEM INTERNET'"));
    }
}
