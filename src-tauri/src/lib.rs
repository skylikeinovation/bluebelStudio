use std::process::Command;

#[tauri::command]
fn run_code(language: String, file_path: String) -> Result<String, String> {
    let output = match language.as_str() {
        "HTML" | "CSS" => {
            // Abre no navegador padrão
            #[cfg(target_os = "linux")]
            let result = Command::new("xdg-open")
                .arg(&file_path)
                .spawn();
            
            #[cfg(target_os = "macos")]
            let result = Command::new("open")
                .arg(&file_path)
                .spawn();
            
            #[cfg(target_os = "windows")]
            let result = Command::new("cmd")
                .args(&["/C", "start", &file_path])
                .spawn();
            
            return match result {
                Ok(_) => Ok(format!("✓ Arquivo aberto no navegador:\n{}", file_path)),
                Err(e) => Err(format!("Erro ao abrir navegador: {}", e)),
            };
        }
        "JavaScript" => {
            Command::new("node")
                .arg(&file_path)
                .output()
        }
        "Python" => {
            Command::new("python3")
                .arg(&file_path)
                .output()
        }
        "Rust" => {
            // Compila e executa
            let exe_path = file_path.replace(".rs", "");
            let compile = Command::new("rustc")
                .arg(&file_path)
                .arg("-o")
                .arg(&exe_path)
                .output();
            
            match compile {
                Ok(result) if result.status.success() => {
                    Command::new(&exe_path).output()
                }
                Ok(result) => {
                    return Ok(format!(
                        "Erro de compilação:\n{}",
                        String::from_utf8_lossy(&result.stderr)
                    ));
                }
                Err(e) => return Err(format!("Erro ao compilar: {}", e)),
            }
        }
        "C" => {
            let exe_path = file_path.replace(".c", "");
            let compile = Command::new("gcc")
                .arg(&file_path)
                .arg("-o")
                .arg(&exe_path)
                .output();
            
            match compile {
                Ok(result) if result.status.success() => {
                    Command::new(&exe_path).output()
                }
                Ok(result) => {
                    return Ok(format!(
                        "Erro de compilação:\n{}",
                        String::from_utf8_lossy(&result.stderr)
                    ));
                }
                Err(e) => return Err(format!("Erro ao compilar: {}", e)),
            }
        }
        "C++" | "CPP" => {
            let exe_path = file_path.replace(".cpp", "").replace(".cc", "");
            let compile = Command::new("g++")
                .arg(&file_path)
                .arg("-o")
                .arg(&exe_path)
                .output();
            
            match compile {
                Ok(result) if result.status.success() => {
                    Command::new(&exe_path).output()
                }
                Ok(result) => {
                    return Ok(format!(
                        "Erro de compilação:\n{}",
                        String::from_utf8_lossy(&result.stderr)
                    ));
                }
                Err(e) => return Err(format!("Erro ao compilar: {}", e)),
            }
        }
        "Zig" => {
            Command::new("zig")
                .arg("run")
                .arg(&file_path)
                .output()
        }
        "Nim" => {
            Command::new("nim")
                .arg("c")
                .arg("-r")
                .arg(&file_path)
                .output()
        }
        _ => return Err(format!("Linguagem '{}' não suportada para execução", language)),
    };

    match output {
        Ok(result) => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            let stderr = String::from_utf8_lossy(&result.stderr);
            
            let mut output_text = String::new();
            
            if !stdout.is_empty() {
                output_text.push_str("Saída:\n");
                output_text.push_str(&stdout);
            }
            
            if !stderr.is_empty() {
                if !output_text.is_empty() {
                    output_text.push_str("\n\n");
                }
                output_text.push_str("Erros/Avisos:\n");
                output_text.push_str(&stderr);
            }
            
            if output_text.is_empty() {
                output_text = "(sem saída)".to_string();
            }
            
            if !result.status.success() {
                output_text = format!("❌ Execução falhou (código: {})\n\n{}", 
                    result.status.code().unwrap_or(-1), 
                    output_text
                );
            }
            
            Ok(output_text)
        }
        Err(e) => Err(format!(
            "Erro ao executar: {}\nVerifique se o compilador/interpretador está instalado.",
            e
        )),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![run_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
