use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use pbkdf2::pbkdf2_hmac;
use rand::Rng;
use sha2::Sha256;

/// PBKDF2 iterations — 600,000 as recommended by OWASP 2023
const PBKDF2_ITERATIONS: u32 = 600_000;

/// Salt size in bytes
const SALT_SIZE: usize = 16;

/// Derive a 32-byte AES-256 key from password + salt using PBKDF2-HMAC-SHA256
fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

/// Encrypt a plaintext string → "ENC:<base64(salt‖nonce‖ciphertext)>"
/// - salt:  16 bytes (for PBKDF2 key derivation)
/// - nonce: 12 bytes (for AES-256-GCM)
/// - ciphertext: variable (includes 16-byte GCM auth tag)
pub fn encrypt(plaintext: &str, password: &str) -> Result<String, String> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }

    let mut rng = rand::thread_rng();

    // Generate random salt for PBKDF2
    let mut salt = [0u8; SALT_SIZE];
    rng.fill(&mut salt);

    // Derive key from password
    let key = derive_key(password, &salt);

    // Generate random nonce for AES-GCM
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Combine: salt (16) + nonce (12) + ciphertext (variable)
    let mut combined = Vec::with_capacity(SALT_SIZE + 12 + ciphertext.len());
    combined.extend_from_slice(&salt);
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(format!("ENC:{}", BASE64.encode(&combined)))
}

/// Decrypt "ENC:<base64(salt‖nonce‖ciphertext)>" → plaintext
pub fn decrypt(encrypted: &str, password: &str) -> Result<String, String> {
    if encrypted.is_empty() {
        return Ok(String::new());
    }
    let data = encrypted
        .strip_prefix("ENC:")
        .ok_or_else(|| "Not an encrypted value".to_string())?;

    let combined = BASE64
        .decode(data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // Need at least salt (16) + nonce (12) + 1 byte ciphertext
    if combined.len() < SALT_SIZE + 12 + 1 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    let (salt, rest) = combined.split_at(SALT_SIZE);
    let (nonce_bytes, ciphertext) = rest.split_at(12);

    // Derive same key from password + stored salt
    let key = derive_key(password, salt);

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed: wrong password or corrupted data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode error: {}", e))
}

/// Fields in Integration objects that contain sensitive data
const SENSITIVE_FIELDS: &[&str] = &["webhookUrl", "botToken", "chatId"];

/// Encrypt sensitive fields in all integrations within a config JSON Value
pub fn encrypt_integrations(config: &mut serde_json::Value, password: &str) {
    if let Some(integrations) = config.get_mut("integrations") {
        if let Some(arr) = integrations.as_array_mut() {
            for integration in arr.iter_mut() {
                for field in SENSITIVE_FIELDS {
                    if let Some(val) = integration.get(field).and_then(|v| v.as_str()) {
                        if !val.is_empty() && !val.starts_with("ENC:") {
                            if let Ok(enc) = encrypt(val, password) {
                                integration[field] = serde_json::Value::String(enc);
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Decrypt sensitive fields in all integrations within a config JSON Value
pub fn decrypt_integrations(
    config: &mut serde_json::Value,
    password: &str,
) -> Result<(), String> {
    if let Some(integrations) = config.get_mut("integrations") {
        if let Some(arr) = integrations.as_array_mut() {
            for integration in arr.iter_mut() {
                for field in SENSITIVE_FIELDS {
                    if let Some(val) = integration.get(field).and_then(|v| v.as_str()) {
                        if val.starts_with("ENC:") {
                            let dec = decrypt(val, password)?;
                            integration[field] = serde_json::Value::String(dec);
                        }
                    }
                }
            }
        }
    }
    Ok(())
}
