use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref VERSION_RE: Regex = Regex::new(r"(\d+)\.(\d+)\.(\d+)").unwrap();
}

pub fn generate_next_tag(latest_tag: Option<String>, default_format: &str) -> String {
    if let Some(tag) = latest_tag {
        if let Some(caps) = VERSION_RE.captures(&tag) {
            let major: u32 = caps[1].parse().unwrap();
            let minor: u32 = caps[2].parse().unwrap();
            let patch: u32 = caps[3].parse().unwrap();

            let (new_minor, new_patch) = if patch >= 9 {
                (minor + 1, 0)
            } else {
                (minor, patch + 1)
            };

            let version_str = format!("{}.{}.{}", major, new_minor, new_patch);
            return default_format.replace("{version}", &version_str);
        }
    }
    
    default_format.replace("{version}", "0.0.1")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_next_tag_simple() {
        assert_eq!(generate_next_tag(Some("stagingf0.0.1".into()), "stagingf{version}"), "stagingf0.0.2");
        assert_eq!(generate_next_tag(Some("stagingf0.0.9".into()), "stagingf{version}"), "stagingf0.1.0");
        // Test suffix ignoring logic
        assert_eq!(generate_next_tag(Some("stagingf0.0.2-etp".into()), "stagingf{version}"), "stagingf0.0.3");
    }

    #[test]
    fn test_generate_next_tag_prod() {
        assert_eq!(generate_next_tag(Some("v10.29.7-prod".into()), "v{version}-prod"), "v10.29.8-prod");
        assert_eq!(generate_next_tag(Some("v10.29.9-prod".into()), "v{version}-prod"), "v10.30.0-prod");
    }
    
    #[test]
    fn test_generate_next_tag_none() {
        assert_eq!(generate_next_tag(None, "stagingf{version}"), "stagingf0.0.1");
        assert_eq!(generate_next_tag(None, "v{version}-prod"), "v0.0.1-prod");
    }
}
