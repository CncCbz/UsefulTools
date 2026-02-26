use serde::{Deserialize, Serialize};
use sysinfo::{Disks, Networks, System};

// ── 数据结构 ──────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub name: String,
    pub usage: f32,
    pub frequency: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub usage_percent: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub file_system: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub name: String,
    pub version: String,
    pub hostname: String,
    pub arch: String,
    pub uptime: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterfaceInfo {
    pub name: String,
    pub mac_address: String,
    pub received: u64,
    pub transmitted: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

// ── Tauri Commands ───────────────────────────────────────

#[tauri::command]
pub fn get_cpu_info() -> Vec<CpuInfo> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_usage();

    sys.cpus()
        .iter()
        .map(|cpu| CpuInfo {
            name: cpu.name().to_string(),
            usage: cpu.cpu_usage(),
            frequency: cpu.frequency(),
        })
        .collect()
}

#[tauri::command]
pub fn get_memory_info() -> MemoryInfo {
    let mut sys = System::new();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let available = sys.available_memory();
    let usage_percent = if total > 0 {
        (used as f32 / total as f32) * 100.0
    } else {
        0.0
    };

    MemoryInfo {
        total,
        used,
        available,
        usage_percent,
    }
}

#[tauri::command]
pub fn get_disk_info() -> Vec<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();
    disks
        .iter()
        .map(|disk| DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
            file_system: disk.file_system().to_string_lossy().to_string(),
        })
        .collect()
}

#[tauri::command]
pub fn get_os_info() -> OsInfo {
    OsInfo {
        name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        arch: System::cpu_arch().unwrap_or_else(|| "Unknown".to_string()),
        uptime: System::uptime(),
    }
}

#[tauri::command]
pub fn get_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            cpu_usage: process.cpu_usage(),
            memory: process.memory(),
        })
        .collect();

    // 按内存占用降序排列，取前 50 个
    processes.sort_by(|a, b| b.memory.cmp(&a.memory));
    processes.truncate(50);
    processes
}

#[tauri::command]
pub fn get_network_info() -> Vec<NetworkInterfaceInfo> {
    let networks = Networks::new_with_refreshed_list();
    networks
        .iter()
        .map(|(name, data)| NetworkInterfaceInfo {
            name: name.to_string(),
            mac_address: data.mac_address().to_string(),
            received: data.total_received(),
            transmitted: data.total_transmitted(),
        })
        .collect()
}

/// 白名单限制的 Shell 命令执行
/// 仅允许执行: ping, ipconfig, systeminfo, whoami, hostname
#[tauri::command]
pub async fn execute_shell(command: String, args: Vec<String>) -> Result<ShellOutput, String> {
    const WHITELIST: &[&str] = &["ping", "ipconfig", "systeminfo", "whoami", "hostname"];

    if !WHITELIST.contains(&command.to_lowercase().as_str()) {
        return Err(format!("命令不在白名单中: {command}"));
    }

    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| format!("执行命令失败: {e}"))?;

    Ok(ShellOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
