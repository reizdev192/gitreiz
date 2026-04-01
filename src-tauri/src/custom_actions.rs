use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn default_context() -> String {
    "global".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAction {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub script: String,
    #[serde(default = "default_context")]
    pub context: String,
}

fn get_actions_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&path).ok();
    path.push("actions.json");
    path
}

#[tauri::command]
pub fn get_custom_actions(app: AppHandle) -> Result<Vec<CustomAction>, String> {
    let path = get_actions_path(&app);
    if path.exists() {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        Ok(serde_json::from_str(&content).unwrap_or_else(|_| vec![]))
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub fn save_custom_actions(app: AppHandle, actions: Vec<CustomAction>) -> Result<(), String> {
    let path = get_actions_path(&app);
    let content = serde_json::to_string_pretty(&actions).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_custom_action(script: String, cwd: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("powershell")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(&script)
            .current_dir(&cwd)
            .output()
    } else {
        std::process::Command::new("sh")
            .arg("-c")
            .arg(&script)
            .current_dir(&cwd)
            .output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(format!("{}\n{}", stderr, stdout))
            }
        }
        Err(e) => Err(format!("Execution failed: {}", e)),
    }
}
