use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let open = MenuItemBuilder::with_id("open", "Deschide Bossnet Proceduri").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "Ascunde fereastra").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Închide aplicația").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&open, &hide, &quit])
                .build()?;
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("iconul implicit trebuie configurat");

            TrayIconBuilder::with_id("bossnet-proceduri-tray")
                .icon(icon)
                .tooltip("Bossnet Proceduri")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("eroare la pornirea Bossnet Proceduri");
}
