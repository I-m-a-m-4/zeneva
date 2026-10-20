mod win_grid;

use std::sync::Mutex;

static LAST_APP_URL: Mutex<Option<String>> = Mutex::new(None);

#[cfg(desktop)]
use tauri::{menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};

#[tauri::command]
fn calculate_secure_loyalty(amount: f64) -> u32 {
    // Mission-critical secure business logic: 1 point per 1000 of currency
    (amount / 1000.0).floor() as u32
}

#[tauri::command]
fn calculate_royalty(total_sales: f64, rate: f64) -> f64 {
    // Secure royalty calculation to prevent tampering
    total_sales * rate
}

#[tauri::command]
fn validate_subscription(access_level: String, trial_expires_at: i64) -> bool {
    if access_level == "lifetime" {
        return true;
    }
    
    let now = match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => d.as_secs() as i64,
        Err(_) => 0,
    };
        
    trial_expires_at > now
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "android")]
  let _ = rustls::crypto::ring::default_provider().install_default();

  println!("Zeneva: Initializing Builder...");
  
  #[allow(unused_mut)]
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default()
      .level(log::LevelFilter::Info)
      .build())
    .invoke_handler(tauri::generate_handler![
        calculate_secure_loyalty, 
        calculate_royalty, 
        validate_subscription,
        win_grid::list_desktop_windows,
        win_grid::read_desktop_grid
    ])
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    // .plugin(tauri_plugin_stronghold::Builder::new(|_password| {
    //     "zeneva-secure-key-2024".as_bytes().to_vec()
    // }).build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(
        tauri::plugin::Builder::<tauri::Wry>::new("auth-navigation")
            .on_page_load(|webview, payload| {
                let url = payload.url().as_str();
                let is_auth_url = url.contains("accounts.google.com")
                    || url.contains("google.com/o/oauth2")
                    || url.contains("firebaseapp.com")
                    || url.contains("accounts.youtube.com");

                let window = webview.window();
                if is_auth_url {
                    let _ = window.set_decorations(true);
                } else if url.contains("localhost") || url.contains("tauri") {
                    let _ = window.set_decorations(false);
                    if let Ok(mut last) = LAST_APP_URL.lock() {
                        *last = Some(url.to_string());
                    }
                }

                if is_auth_url {
                    let return_url = LAST_APP_URL
                        .lock()
                        .ok()
                        .and_then(|guard| guard.clone())
                        .unwrap_or_else(|| {
                            if cfg!(debug_assertions) {
                                "http://localhost:9007/login".to_string()
                            } else {
                                "https://tauri.localhost/login".to_string()
                            }
                        });

                    let return_url_json = serde_json::to_string(&return_url)
                        .unwrap_or_else(|_| "\"http://localhost:9007/login\"".to_string());

                    let js = format!(
                        r#"
                        (function() {{
                            var RETURN_URL = {return_url_json};
                            
                            function doGoBack(e) {{
                                if (e) {{
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                var btn = document.getElementById('zeneva-back-btn');
                                if (btn) {{
                                    btn.textContent = 'Returning to Zeneva...';
                                    btn.style.opacity = '0.7';
                                    btn.style.pointerEvents = 'none';
                                }}
                                window.location.replace(RETURN_URL);
                            }}

                            function injectNav() {{
                                if (document.getElementById('zeneva-auth-nav-bar')) return;

                                var bar = document.createElement('div');
                                bar.id = 'zeneva-auth-nav-bar';
                                bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:48px;background:#141416;border-bottom:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:2147483647;box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;user-select:none;box-sizing:border-box;';

                                var btn = document.createElement('button');
                                btn.type = 'button';
                                btn.id = 'zeneva-back-btn';
                                btn.style.cssText = 'background:#202024;color:#f47125;border:1px solid rgba(244,113,37,0.5);padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s ease;outline:none;';

                                var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                svg.setAttribute('width', '15');
                                svg.setAttribute('height', '15');
                                svg.setAttribute('viewBox', '0 0 24 24');
                                svg.setAttribute('fill', 'none');
                                svg.setAttribute('stroke', 'currentColor');
                                svg.setAttribute('stroke-width', '2.5');
                                svg.setAttribute('stroke-linecap', 'round');
                                svg.setAttribute('stroke-linejoin', 'round');

                                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                path.setAttribute('d', 'M19 12H5M12 19l-7-7 7-7');
                                svg.appendChild(path);
                                btn.appendChild(svg);

                                var label = document.createElement('span');
                                label.textContent = 'Cancel & Back to Zeneva';
                                btn.appendChild(label);

                                var kbd = document.createElement('span');
                                kbd.textContent = 'Esc';
                                kbd.style.cssText = 'background:rgba(255,255,255,0.08);color:#a1a1aa;font-size:10px;padding:2px 5px;border-radius:4px;border:1px solid rgba(255,255,255,0.12);margin-left:4px;font-weight:500;';
                                btn.appendChild(kbd);

                                btn.onmouseover = function() {{
                                    btn.style.background = '#f47125';
                                    btn.style.color = '#ffffff';
                                    btn.style.borderColor = '#f47125';
                                    btn.style.boxShadow = '0 4px 12px rgba(244,113,37,0.35)';
                                    kbd.style.color = '#ffffff';
                                    kbd.style.borderColor = 'rgba(255,255,255,0.4)';
                                }};
                                btn.onmouseout = function() {{
                                    btn.style.background = '#202024';
                                    btn.style.color = '#f47125';
                                    btn.style.borderColor = 'rgba(244,113,37,0.5)';
                                    btn.style.boxShadow = 'none';
                                    kbd.style.color = '#a1a1aa';
                                    kbd.style.borderColor = 'rgba(255,255,255,0.12)';
                                }};

                                btn.onclick = doGoBack;

                                var right = document.createElement('div');
                                right.style.cssText = 'display:flex;align-items:center;gap:8px;color:#a1a1aa;font-size:12px;font-weight:500;';

                                var dot = document.createElement('span');
                                dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#f47125;display:inline-block;box-shadow:0 0 6px #f47125;';
                                right.appendChild(dot);

                                var text = document.createElement('span');
                                text.textContent = 'Signing in to Zeneva';
                                right.appendChild(text);

                                bar.appendChild(btn);
                                bar.appendChild(right);

                                function attach() {{
                                    if (document.body) {{
                                        document.body.style.setProperty('padding-top', '52px', 'important');
                                        document.body.appendChild(bar);
                                    }}
                                }}

                                if (document.body) {{
                                    attach();
                                }} else {{
                                    document.addEventListener('DOMContentLoaded', attach);
                                }}

                                window.addEventListener('keydown', function(e) {{
                                    if (e.key === 'Escape') {{
                                        doGoBack(e);
                                    }}
                                }});
                            }}

                            injectNav();
                            var timer = setInterval(injectNav, 300);
                            setTimeout(function() {{ clearInterval(timer); }}, 15000);
                        }})();
                        "#
                    );
                    let _ = webview.eval(&js);
                }
            })
            .build()
    );

  // Single-instance: if a second instance is launched, show the existing window
  #[cfg(desktop)]
  {
    use tauri::Manager;
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        println!("Zeneva: Second instance detected — focusing existing window.");
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));
  }

  builder
    .setup(|app| {
        println!("Zeneva: Entering setup...");

        #[cfg(desktop)]
        {
            use tauri::Manager;
            // FIX: Explicitly show and focus the main window on startup.
            // This is the primary fix — without this, the window can start hidden.
            if let Some(window) = app.get_webview_window("main") {
                println!("Zeneva: Showing and focusing main window...");
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            } else {
                println!("Zeneva: WARNING — could not find 'main' window in setup!");
            }

            // Build tray menu
            let quit_i = MenuItem::with_id(app, "quit", "Quit Zeneva", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Zeneva Dashboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Build tray icon (non-fatal if icon is missing)
            if let Some(tray_icon) = app.default_window_icon().cloned() {
                println!("Zeneva: Building tray icon...");
                let tray_result = TrayIconBuilder::new()
                    .icon(tray_icon)
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "quit" => {
                                println!("Zeneva: Quit requested from tray.");
                                std::process::exit(0);
                            }
                            "show" => {
                                if let Some(win) = app.get_webview_window("main") {
                                    let _ = win.show();
                                    let _ = win.unminimize();
                                    let _ = win.set_focus();
                                }
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                    })
                    .build(app);

                match tray_result {
                    Ok(_) => println!("Zeneva: Tray icon built successfully."),
                    Err(e) => println!("Zeneva: WARNING — Tray icon failed to build: {:?}", e),
                }
            } else {
                println!("Zeneva: WARNING — No default window icon found, skipping tray.");
            }
        }
        
        #[cfg(mobile)]
        {
            let _ = app;
        }

        println!("Zeneva: Setup completed successfully.");
        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
