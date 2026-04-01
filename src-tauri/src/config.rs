use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::crypto;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeployEnvironment {
    pub name: String,
    pub tag_format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub environments: Vec<DeployEnvironment>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub projects: Vec<ProjectConfig>,
}

pub fn get_config_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&path).ok();
    path.push("config.json");
    path
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<serde_json::Value, String> {
    let path = get_config_path(&app);
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(serde_json::json!({ "projects": [] }))
    }
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: serde_json::Value) -> Result<(), String> {
    let path = get_config_path(&app);
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_settings_cmd(app: AppHandle, file_path: String, password: String) -> Result<(), String> {
    if password.len() < 4 {
        return Err("Password must be at least 4 characters".to_string());
    }
    let config_path = get_config_path(&app);
    if !config_path.exists() {
        return Err("No config file found".to_string());
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;

    // Parse as generic Value to preserve ALL fields (integrations, hooks, favorites, etc.)
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Encrypt sensitive fields (webhookUrl, botToken, chatId) using user password
    crypto::encrypt_integrations(&mut config, &password);

    // Add export metadata
    config["_encrypted"] = serde_json::json!(true);
    config["_app"] = serde_json::json!("ZenGit");
    config["_version"] = serde_json::json!("2.0");

    let output = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&file_path, output).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_settings_cmd(app: AppHandle, file_path: String, password: String) -> Result<(), String> {
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;

    // Parse as generic Value to preserve ALL fields
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid config file: {}", e))?;

    // Must be a ZenGit export file
    let is_zengit = config
        .get("_app")
        .and_then(|v| v.as_str())
        .map_or(false, |v| v == "ZenGit");

    if !is_zengit {
        return Err("This is not a valid ZenGit settings file".to_string());
    }

    // Decrypt sensitive fields if the file was encrypted
    let is_encrypted = config
        .get("_encrypted")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if is_encrypted {
        crypto::decrypt_integrations(&mut config, &password)
            .map_err(|_| "Wrong password or corrupted file".to_string())?;
    }

    // Remove export metadata before saving
    if let Some(obj) = config.as_object_mut() {
        obj.remove("_encrypted");
        obj.remove("_app");
        obj.remove("_version");
    }

    // Validate that it at least has a "projects" array
    if config.get("projects").and_then(|v| v.as_array()).is_none() {
        return Err("Invalid config: missing 'projects' field".to_string());
    }

    // Save the imported config
    let config_path = get_config_path(&app);
    let pretty = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, pretty).map_err(|e| e.to_string())?;
    Ok(())
}
