use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// ── 插件元数据（单个工具） ──────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginMeta {
    pub id: String,
    pub version: String,
    pub author: String,
    pub homepage: Option<String>,
    pub icon: String,
    pub title: String,
    pub subtitle: String,
    pub description: String,
    pub bg_color: String,
    pub text_color: Option<String>,
    pub categories: Vec<String>,
    pub requires: Vec<String>,
    /// npm 包名（如 usefultools-plugin-official）
    pub package_name: String,
    /// bundle 文件名（如 json-formatter.mjs）
    pub bundle_file: String,
    pub downloads: Option<u64>,
    pub rating: Option<f32>,
    pub updated_at: Option<String>,
    pub created_at: Option<String>,
}

// ── 已安装插件信息 ──────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPluginInfo {
    pub meta: PluginMeta,
    pub installed_at: u64,
    pub updated_at: u64,
    pub local_bundle_path: String,
    pub enabled: bool,
}

// ── npm 包中的 plugin.json 格式 ─────────────────────────────

/// 单个工具的元数据（plugin.json 中 plugins 数组的元素）
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginJsonEntry {
    pub id: String,
    pub version: String,
    pub author: String,
    pub homepage: Option<String>,
    pub icon: String,
    pub title: String,
    pub subtitle: String,
    pub description: String,
    pub bg_color: String,
    pub text_color: Option<String>,
    pub categories: Vec<String>,
    #[serde(default)]
    pub requires: Vec<String>,
    /// bundle 文件相对路径（如 dist/json-formatter.mjs）
    pub bundle: String,
}

/// plugin.json 根结构（支持单工具或多工具）
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum PluginJson {
    /// 多工具包：{ "plugins": [...] }
    Multi { plugins: Vec<PluginJsonEntry> },
    /// 单工具包：直接是一个 PluginJsonEntry
    Single(PluginJsonEntry),
}

impl PluginJson {
    pub fn into_entries(self) -> Vec<PluginJsonEntry> {
        match self {
            PluginJson::Multi { plugins } => plugins,
            PluginJson::Single(entry) => vec![entry],
        }
    }
}

// ── npm registry 响应结构 ───────────────────────────────────

#[derive(Deserialize, Debug)]
struct NpmSearchResponse {
    objects: Vec<NpmSearchObject>,
}

#[derive(Deserialize, Debug)]
struct NpmSearchObject {
    package: NpmPackageInfo,
}

#[derive(Deserialize, Debug)]
struct NpmPackageInfo {
    name: String,
    version: String,
    description: Option<String>,
    date: Option<String>,
    links: Option<NpmLinks>,
}

#[derive(Deserialize, Debug)]
struct NpmLinks {
    npm: Option<String>,
    homepage: Option<String>,
    repository: Option<String>,
}

/// npm 包的 package.json（从 tarball 中解析）
#[derive(Deserialize, Debug)]
struct NpmPackageJson {
    name: String,
    version: String,
    dist: Option<NpmDist>,
}

#[derive(Deserialize, Debug)]
struct NpmDist {
    tarball: Option<String>,
}

/// npm registry 单包信息（GET /<package>）
#[derive(Deserialize, Debug)]
struct NpmPackageDetail {
    name: String,
    #[serde(rename = "dist-tags")]
    dist_tags: Option<std::collections::HashMap<String, String>>,
    versions: Option<std::collections::HashMap<String, NpmVersionDetail>>,
}

#[derive(Deserialize, Debug)]
struct NpmVersionDetail {
    version: String,
    dist: Option<NpmVersionDist>,
}

#[derive(Deserialize, Debug)]
struct NpmVersionDist {
    tarball: Option<String>,
}

// ── 注册表缓存 ─────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegistryCache {
    pub fetched_at: u64,
    pub ttl: u64,
    pub plugins: Vec<PluginMeta>,
}

// ── 辅助函数 ────────────────────────────────────────────────

pub fn plugins_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))?;
    Ok(base.join("plugins"))
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

const DEFAULT_NPM_REGISTRY: &str = "https://registry.npmjs.org";
const NPM_SEARCH_KEYWORD: &str = "usefultools-plugin";
const OFFICIAL_PACKAGE: &str = "usefultools-plugin-official";
const DEFAULT_TTL: u64 = 3_600_000; // 1 小时

// ── 用户配置 ────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginConfig {
    /// npm registry 地址，默认 https://registry.npmjs.org
    pub registry: String,
}

impl Default for PluginConfig {
    fn default() -> Self {
        Self {
            registry: DEFAULT_NPM_REGISTRY.to_string(),
        }
    }
}

/// 读取配置文件，不存在则返回默认值
async fn load_config(app: &tauri::AppHandle) -> PluginConfig {
    let dir = match plugins_dir(app) {
        Ok(d) => d,
        Err(_) => return PluginConfig::default(),
    };
    let config_path = dir.join("config.json");
    match tokio::fs::read_to_string(&config_path).await {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => PluginConfig::default(),
    }
}

#[tauri::command]
pub async fn get_plugin_config(app: tauri::AppHandle) -> Result<PluginConfig, String> {
    Ok(load_config(&app).await)
}

#[tauri::command]
pub async fn set_plugin_config(
    app: tauri::AppHandle,
    config: PluginConfig,
) -> Result<(), String> {
    let dir = plugins_dir(&app)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("无法创建插件目录: {e}"))?;
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {e}"))?;
    tokio::fs::write(dir.join("config.json"), json)
        .await
        .map_err(|e| format!("写入配置失败: {e}"))
}

// ── 从 npm 搜索并解析插件注册表 ─────────────────────────────

/// 执行一次 npm search 请求，返回包名列表
async fn npm_search(client: &reqwest::Client, registry: &str, query: &str) -> Vec<String> {
    let url = format!("{}/-/v1/search?text={}&size=100", registry, query);
    let resp = match client.get(&url).send().await {
        Ok(r) if r.status().is_success() => r,
        _ => return Vec::new(),
    };
    let data: NpmSearchResponse = match resp.json().await {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    data.objects.into_iter().map(|o| o.package.name).collect()
}

/// 判断包名是否为 usefultools 插件
/// 支持: usefultools-plugin-xxx 或 @scope/usefultools-plugin-xxx
fn is_usefultools_package(name: &str) -> bool {
    if name.starts_with(NPM_SEARCH_KEYWORD) {
        return true;
    }
    // scoped 包: @scope/usefultools-plugin...
    if let Some(pos) = name.find('/') {
        return name[pos + 1..].starts_with(NPM_SEARCH_KEYWORD);
    }
    false
}

async fn fetch_npm_plugins(registry: &str) -> Result<Vec<PluginMeta>, String> {
    let client = reqwest::Client::new();
    let mut all_plugins: Vec<PluginMeta> = Vec::new();

    // 双重搜索：keyword 搜索 + 包名文本搜索，合并去重
    let keyword_results = npm_search(&client, registry, &format!("keywords:{}", NPM_SEARCH_KEYWORD)).await;
    let text_results = npm_search(&client, registry, NPM_SEARCH_KEYWORD).await;

    let mut seen = std::collections::HashSet::new();
    let mut package_names: Vec<String> = Vec::new();

    // 合并两次搜索结果，去重，支持 scoped 和非 scoped 包名
    for name in keyword_results.into_iter().chain(text_results.into_iter()) {
        if is_usefultools_package(&name) && seen.insert(name.clone()) {
            // 官方包排在最前面
            if name == OFFICIAL_PACKAGE {
                package_names.insert(0, name);
            } else {
                package_names.push(name);
            }
        }
    }

    // 逐个包获取 tarball 并解析 plugin.json
    for pkg_name in &package_names {
        match fetch_package_plugins(&client, registry, pkg_name).await {
            Ok(plugins) => all_plugins.extend(plugins),
            Err(e) => {
                eprintln!("解析包 {} 失败: {}", pkg_name, e);
                continue; // 单个包失败不影响其他包
            }
        }
    }

    Ok(all_plugins)
}

/// 从单个 npm 包中提取所有插件元数据
async fn fetch_package_plugins(
    client: &reqwest::Client,
    registry: &str,
    package_name: &str,
) -> Result<Vec<PluginMeta>, String> {
    // 获取包详情，拿到 tarball URL
    let detail_url = format!("{}/{}", registry, package_name);
    let detail_resp = client
        .get(&detail_url)
        .send()
        .await
        .map_err(|e| format!("获取包详情失败: {e}"))?;

    if !detail_resp.status().is_success() {
        return Err(format!("包 {} 不存在或请求失败", package_name));
    }

    let detail: NpmPackageDetail = detail_resp
        .json()
        .await
        .map_err(|e| format!("解析包详情失败: {e}"))?;

    // 获取 latest 版本的 tarball URL
    let latest_version = detail
        .dist_tags
        .as_ref()
        .and_then(|tags| tags.get("latest"))
        .ok_or_else(|| format!("包 {} 没有 latest 版本", package_name))?;

    let version_detail = detail
        .versions
        .as_ref()
        .and_then(|v| v.get(latest_version))
        .ok_or_else(|| format!("找不到版本 {} 的详情", latest_version))?;

    let tarball_url = version_detail
        .dist
        .as_ref()
        .and_then(|d| d.tarball.as_ref())
        .ok_or_else(|| format!("找不到 tarball URL"))?;

    // 下载 tarball
    let tarball_resp = client
        .get(tarball_url)
        .send()
        .await
        .map_err(|e| format!("下载 tarball 失败: {e}"))?;

    let tarball_bytes = tarball_resp
        .bytes()
        .await
        .map_err(|e| format!("读取 tarball 失败: {e}"))?;

    // 解压 .tgz 并提取 plugin.json
    let plugin_json_content = extract_file_from_tarball(&tarball_bytes, "package/plugin.json")
        .ok_or_else(|| format!("包 {} 中未找到 plugin.json", package_name))?;

    let plugin_json: PluginJson = serde_json::from_str(&plugin_json_content)
        .map_err(|e| format!("解析 plugin.json 失败: {e}"))?;

    let entries = plugin_json.into_entries();
    let mut plugins = Vec::new();

    for entry in entries {
        plugins.push(PluginMeta {
            id: entry.id.clone(),
            version: entry.version.clone(),
            author: entry.author.clone(),
            homepage: entry.homepage.clone(),
            icon: entry.icon,
            title: entry.title,
            subtitle: entry.subtitle,
            description: entry.description,
            bg_color: entry.bg_color,
            text_color: entry.text_color,
            categories: entry.categories,
            requires: entry.requires,
            package_name: package_name.to_string(),
            bundle_file: entry.bundle.clone(),
            downloads: None,
            rating: None,
            updated_at: None,
            created_at: None,
        });
    }

    Ok(plugins)
}

/// 从 .tgz (gzip + tar) 中提取指定文件内容
fn extract_file_from_tarball(tgz_bytes: &[u8], target_path: &str) -> Option<String> {
    use std::io::Read;

    let gz = flate2::read::GzDecoder::new(tgz_bytes);
    let mut archive = tar::Archive::new(gz);

    for entry in archive.entries().ok()? {
        let mut entry = entry.ok()?;
        let path = entry.path().ok()?;

        if path.to_string_lossy() == target_path {
            let mut content = String::new();
            entry.read_to_string(&mut content).ok()?;
            return Some(content);
        }
    }

    None
}

/// 从 .tgz 中提取指定文件的原始字节
fn extract_bytes_from_tarball(tgz_bytes: &[u8], target_path: &str) -> Option<Vec<u8>> {
    use std::io::Read;

    let gz = flate2::read::GzDecoder::new(tgz_bytes);
    let mut archive = tar::Archive::new(gz);

    for entry in archive.entries().ok()? {
        let mut entry = entry.ok()?;
        let path = entry.path().ok()?;

        if path.to_string_lossy() == target_path {
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).ok()?;
            return Some(buf);
        }
    }

    None
}

// ── 手动添加包 command ──────────────────────────────────────

#[tauri::command]
pub async fn fetch_package_by_name(
    app: tauri::AppHandle,
    package_name: String,
) -> Result<Vec<PluginMeta>, String> {
    let name = package_name.trim().to_string();

    // 校验包名格式
    if !is_usefultools_package(&name) {
        return Err(format!(
            "包名 \"{}\" 不符合规则，必须以 usefultools-plugin 开头（scoped 包取 / 后面的部分）",
            name
        ));
    }

    let config = load_config(&app).await;
    let client = reqwest::Client::new();

    fetch_package_plugins(&client, &config.registry, &name).await
}

// ── 注册表获取 command ──────────────────────────────────────

#[tauri::command]
pub async fn fetch_plugin_registry(
    app: tauri::AppHandle,
    force_refresh: bool,
) -> Result<Vec<PluginMeta>, String> {
    let dir = plugins_dir(&app)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("无法创建插件目录: {e}"))?;

    let cache_path = dir.join("registry-cache.json");

    // 尝试读取本地缓存
    let local_cache = read_cache(&cache_path).await;

    if !force_refresh {
        if let Some(ref cache) = local_cache {
            if cache.fetched_at + cache.ttl > now_ms() {
                return Ok(cache.plugins.clone());
            }
        }
    }

    // 从 npm 拉取
    let config = load_config(&app).await;
    match fetch_npm_plugins(&config.registry).await {
        Ok(plugins) => {
            let new_cache = RegistryCache {
                fetched_at: now_ms(),
                ttl: DEFAULT_TTL,
                plugins: plugins.clone(),
            };
            let _ = write_cache(&cache_path, &new_cache).await;
            Ok(plugins)
        }
        Err(net_err) => {
            if let Some(cache) = local_cache {
                Ok(cache.plugins)
            } else {
                Err(format!("无法获取插件注册表且无本地缓存: {net_err}"))
            }
        }
    }
}

async fn read_cache(path: &PathBuf) -> Option<RegistryCache> {
    let content = tokio::fs::read_to_string(path).await.ok()?;
    serde_json::from_str(&content).ok()
}

async fn write_cache(path: &PathBuf, cache: &RegistryCache) -> Result<(), String> {
    let json =
        serde_json::to_string_pretty(cache).map_err(|e| format!("序列化缓存失败: {e}"))?;
    tokio::fs::write(path, json)
        .await
        .map_err(|e| format!("写入缓存文件失败: {e}"))
}

// ── 插件安装 command ────────────────────────────────────────

#[tauri::command]
pub async fn install_plugin(
    app: tauri::AppHandle,
    plugin: PluginMeta,
) -> Result<InstalledPluginInfo, String> {
    let client = reqwest::Client::new();
    let dir = plugins_dir(&app)?;
    let plugin_dir = dir.join(&plugin.id);

    tokio::fs::create_dir_all(&plugin_dir)
        .await
        .map_err(|e| format!("无法创建插件目录: {e}"))?;

    // 获取 npm 包的 tarball URL
    let config = load_config(&app).await;
    let detail_url = format!("{}/{}", config.registry, plugin.package_name);
    let detail_resp = client
        .get(&detail_url)
        .send()
        .await
        .map_err(|e| format!("获取包详情失败: {e}"))?;

    let detail: NpmPackageDetail = detail_resp
        .json()
        .await
        .map_err(|e| format!("解析包详情失败: {e}"))?;

    let latest_version = detail
        .dist_tags
        .as_ref()
        .and_then(|tags| tags.get("latest"))
        .ok_or_else(|| "找不到 latest 版本".to_string())?
        .clone();

    let tarball_url = detail
        .versions
        .as_ref()
        .and_then(|v| v.get(&latest_version))
        .and_then(|v| v.dist.as_ref())
        .and_then(|d| d.tarball.as_ref())
        .ok_or_else(|| "找不到 tarball URL".to_string())?
        .clone();

    // 下载 tarball
    let tarball_resp = client
        .get(&tarball_url)
        .send()
        .await
        .map_err(|e| format!("下载 tarball 失败: {e}"))?;

    let tarball_bytes = tarball_resp
        .bytes()
        .await
        .map_err(|e| format!("读取 tarball 失败: {e}"))?;

    // 从 tarball 中提取 bundle 文件
    let bundle_tar_path = format!("package/{}", plugin.bundle_file);
    let bundle_bytes = extract_bytes_from_tarball(&tarball_bytes, &bundle_tar_path)
        .ok_or_else(|| format!("tarball 中未找到 {}", bundle_tar_path))?;

    // 写入 bundle.mjs
    let bundle_path = plugin_dir.join("bundle.mjs");
    tokio::fs::write(&bundle_path, &bundle_bytes)
        .await
        .map_err(|e| format!("写入 bundle.mjs 失败: {e}"))?;

    // 写入 meta.json
    let meta_json =
        serde_json::to_string_pretty(&plugin).map_err(|e| format!("序列化元数据失败: {e}"))?;
    tokio::fs::write(plugin_dir.join("meta.json"), meta_json)
        .await
        .map_err(|e| format!("写入 meta.json 失败: {e}"))?;

    let now = now_ms();
    Ok(InstalledPluginInfo {
        meta: plugin,
        installed_at: now,
        updated_at: now,
        local_bundle_path: bundle_path.to_string_lossy().to_string(),
        enabled: true,
    })
}

// ── 插件卸载 command ────────────────────────────────────────

#[tauri::command]
pub async fn uninstall_plugin(app: tauri::AppHandle, plugin_id: String) -> Result<(), String> {
    let dir = plugins_dir(&app)?;
    let plugin_dir = dir.join(&plugin_id);

    if !plugin_dir.exists() {
        return Ok(());
    }

    tokio::fs::remove_dir_all(&plugin_dir)
        .await
        .map_err(|e| format!("删除插件目录失败: {e}"))
}

// ── 获取已安装插件列表 command ──────────────────────────────

#[tauri::command]
pub async fn get_installed_plugins(
    app: tauri::AppHandle,
) -> Result<Vec<InstalledPluginInfo>, String> {
    let dir = plugins_dir(&app)?;

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = tokio::fs::read_dir(&dir)
        .await
        .map_err(|e| format!("读取插件目录失败: {e}"))?;

    let mut plugins = Vec::new();

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("遍历插件目录失败: {e}"))?
    {
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let meta_path = path.join("meta.json");
        let bundle_path = path.join("bundle.mjs");

        if !meta_path.exists() || !bundle_path.exists() {
            continue;
        }

        let meta_content = match tokio::fs::read_to_string(&meta_path).await {
            Ok(content) => content,
            Err(_) => continue,
        };

        let meta: PluginMeta = match serde_json::from_str(&meta_content) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let (installed_at, updated_at) = match tokio::fs::metadata(&meta_path).await {
            Ok(file_meta) => {
                let created = file_meta
                    .created()
                    .unwrap_or(SystemTime::UNIX_EPOCH)
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                let modified = file_meta
                    .modified()
                    .unwrap_or(SystemTime::UNIX_EPOCH)
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                (created, modified)
            }
            Err(_) => {
                let now = now_ms();
                (now, now)
            }
        };

        plugins.push(InstalledPluginInfo {
            meta,
            installed_at,
            updated_at,
            local_bundle_path: bundle_path.to_string_lossy().to_string(),
            enabled: true,
        });
    }

    Ok(plugins)
}

// ── 获取插件 bundle 路径 command ────────────────────────────

#[tauri::command]
pub async fn get_plugin_bundle_path(
    app: tauri::AppHandle,
    plugin_id: String,
) -> Result<String, String> {
    let dir = plugins_dir(&app)?;
    let bundle_path = dir.join(&plugin_id).join("bundle.mjs");

    if !bundle_path.exists() {
        return Err(format!("插件 bundle 文件不存在: {plugin_id}"));
    }

    Ok(bundle_path.to_string_lossy().to_string())
}

// ── 读取插件 bundle 内容 command ────────────────────────────

#[tauri::command]
pub async fn read_plugin_bundle(
    app: tauri::AppHandle,
    plugin_id: String,
) -> Result<String, String> {
    let dir = plugins_dir(&app)?;
    let bundle_path = dir.join(&plugin_id).join("bundle.mjs");

    if !bundle_path.exists() {
        return Err(format!("插件 bundle 文件不存在: {plugin_id}"));
    }

    tokio::fs::read_to_string(&bundle_path)
        .await
        .map_err(|e| format!("读取插件 bundle 失败: {e}"))
}

// ── 读取本地 bundle 文件（调试用） ──────────────────────────

#[tauri::command]
pub async fn read_local_bundle(file_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);

    if !path.exists() {
        return Err(format!("文件不存在: {file_path}"));
    }

    if path.extension().and_then(|e| e.to_str()) != Some("mjs") {
        return Err("仅支持 .mjs 文件".to_string());
    }

    tokio::fs::read_to_string(path)
        .await
        .map_err(|e| format!("读取文件失败: {e}"))
}

// ── 读取本地 plugin.json（调试用） ──────────────────────────

#[tauri::command]
pub async fn read_local_plugin_json(dir_path: String) -> Result<Vec<PluginMeta>, String> {
    let dir = std::path::Path::new(&dir_path);
    let plugin_json_path = dir.join("plugin.json");

    if !plugin_json_path.exists() {
        return Err(format!("未找到 plugin.json: {}", plugin_json_path.display()));
    }

    let content = tokio::fs::read_to_string(&plugin_json_path)
        .await
        .map_err(|e| format!("读取 plugin.json 失败: {e}"))?;

    let plugin_json: PluginJson = serde_json::from_str(&content)
        .map_err(|e| format!("解析 plugin.json 失败: {e}"))?;

    let entries = plugin_json.into_entries();
    let mut plugins = Vec::new();

    for entry in entries {
        // 检查 bundle 文件是否存在
        let bundle_path = dir.join(&entry.bundle);
        if !bundle_path.exists() {
            eprintln!("跳过 {}: bundle 文件不存在 {}", entry.id, bundle_path.display());
            continue;
        }

        plugins.push(PluginMeta {
            id: entry.id,
            version: entry.version,
            author: entry.author,
            homepage: entry.homepage,
            icon: entry.icon,
            title: entry.title,
            subtitle: entry.subtitle,
            description: entry.description,
            bg_color: entry.bg_color,
            text_color: entry.text_color,
            categories: entry.categories,
            requires: entry.requires,
            package_name: "local-debug".to_string(),
            bundle_file: entry.bundle,
            downloads: None,
            rating: None,
            updated_at: None,
            created_at: None,
        });
    }

    if plugins.is_empty() {
        return Err("未找到有效的插件条目".to_string());
    }

    Ok(plugins)
}

// ── 检查插件更新 command ────────────────────────────────────

#[tauri::command]
pub async fn check_plugin_updates(
    app: tauri::AppHandle,
) -> Result<Vec<PluginMeta>, String> {
    let installed = get_installed_plugins(app.clone()).await?;
    let remote_plugins = fetch_plugin_registry(app, false).await?;

    let local_versions: std::collections::HashMap<String, String> = installed
        .into_iter()
        .map(|p| (p.meta.id.clone(), p.meta.version.clone()))
        .collect();

    let updates: Vec<PluginMeta> = remote_plugins
        .into_iter()
        .filter(|remote| {
            if let Some(local_version) = local_versions.get(&remote.id) {
                remote.version != *local_version
            } else {
                false
            }
        })
        .collect();

    Ok(updates)
}
