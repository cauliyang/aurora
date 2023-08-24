// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::CustomMenuItem;
use tauri::{Builder, Menu, SystemTray, SystemTrayEvent, Window};

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let contents = std::fs::read_to_string(path);
    contents.map_err(|e| e.to_string())
}

fn main() {
    Builder::default()
        .menu(
            Menu::new()
                .add_native_item(CustomMenuItem::Copy)
                .add_native_item(CustomMenuItem::Paste)
                .add_menu(
                    Menu::new()
                        .title("File")
                        .add_menu(Menu::new().title("New").add_item(CustomMenuItem::NewFile)),
                ),
        )
        .system_tray(
            SystemTray::new().with_menu(
                SystemTray::new()
                    .add_item(CustomMenuItem::NewFile)
                    .add_item(CustomMenuItem::NewWindow),
            ),
        )
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
