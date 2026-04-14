use tauri::{Manager, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};

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
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
        
    trial_expires_at > now
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        let _ = app.get_webview_window("main")
            .expect("no main window")
            .show();
        let _ = app.get_webview_window("main")
            .expect("no main window")
            .set_focus();
    }))
    .invoke_handler(tauri::generate_handler![
        calculate_secure_loyalty, 
        calculate_royalty, 
        validate_subscription
    ])
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_stronghold::Builder::new(|_password| {
        "zeneva-secure-key-2024".as_bytes().to_vec()
    }).build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // On Windows, hide the window instead of closing it
            // This keeps the app running in the system tray
            #[cfg(target_os = "windows")]
            {
                api.prevent_close();
                let _ = window.hide();
            }
        }
    })
    .setup(|app| {
        let quit_i = MenuItem::with_id(app, "quit", "Quit Zeneva", true, None::<&str>)?;
        let show_i = MenuItem::with_id(app, "show", "Show Zeneva Dashboard", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

        let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .on_menu_event(|app, event| {
                match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        let win = app.get_webview_window("main").unwrap();
                        win.show().unwrap();
                        win.set_focus().unwrap();
                    }
                    _ => {}
                }
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                    let app = tray.app_handle();
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            })
            .build(app)?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
