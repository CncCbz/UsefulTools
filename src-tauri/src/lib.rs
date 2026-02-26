mod plugin_manager;
mod system_commands;

use local_ip_address::local_ip;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_local_ip() -> String {
    match local_ip() {
        Ok(ip) => ip.to_string(),
        Err(_) => "未知".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_local_ip,
            plugin_manager::fetch_plugin_registry,
            plugin_manager::install_plugin,
            plugin_manager::uninstall_plugin,
            plugin_manager::get_installed_plugins,
            plugin_manager::get_plugin_bundle_path,
            plugin_manager::read_plugin_bundle,
            plugin_manager::read_local_bundle,
            plugin_manager::read_local_plugin_json,
            plugin_manager::check_plugin_updates,
            plugin_manager::fetch_package_by_name,
            plugin_manager::get_plugin_config,
            plugin_manager::set_plugin_config,
            system_commands::get_cpu_info,
            system_commands::get_memory_info,
            system_commands::get_disk_info,
            system_commands::get_os_info,
            system_commands::get_processes,
            system_commands::get_network_info,
            system_commands::execute_shell,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
