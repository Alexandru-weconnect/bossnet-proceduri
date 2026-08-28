use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    thread,
    time::{Duration, Instant},
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use url::Url;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const OAUTH_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GoogleOAuthResult {
    id_token: String,
    nonce: String,
}

#[derive(Deserialize)]
struct GoogleTokenResponse {
    error: Option<String>,
    error_description: Option<String>,
    id_token: Option<String>,
}

fn random_urlsafe(byte_count: usize) -> String {
    let mut bytes = vec![0_u8; byte_count];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn write_browser_response(
    stream: &mut std::net::TcpStream,
    status: &str,
    heading: &str,
    detail: &str,
) {
    let body = format!(
        "<!doctype html><html lang=\"ro\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Bossnet Proceduri</title><style>body{{margin:0;display:grid;min-height:100vh;place-items:center;background:#000;color:#fff;font-family:Arial,sans-serif}}main{{width:min(520px,calc(100% - 48px));padding:42px;border-top:3px solid #ffc000;background:#0a0a0a}}small{{color:#ffc000;letter-spacing:.18em}}h1{{margin:14px 0 10px;font-size:36px;text-transform:uppercase}}p{{color:#999;line-height:1.7}}</style><main><small>BOSSNET / GOOGLE WORKSPACE</small><h1>{heading}</h1><p>{detail}</p></main></html>"
    );
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn wait_for_oauth_callback(
    listener: TcpListener,
    expected_state: String,
) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|_| "Callback-ul local nu poate fi configurat".to_string())?;
    let started_at = Instant::now();

    while started_at.elapsed() < OAUTH_TIMEOUT {
        let (mut stream, _) = match listener.accept() {
            Ok(connection) => connection,
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(120));
                continue;
            }
            Err(_) => return Err("Callback-ul Google nu a putut fi primit".to_string()),
        };

        let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
        let mut buffer = [0_u8; 8192];
        let bytes_read = stream
            .read(&mut buffer)
            .map_err(|_| "Răspunsul browserului nu a putut fi citit".to_string())?;
        let request = String::from_utf8_lossy(&buffer[..bytes_read]);
        let target = request
            .lines()
            .next()
            .and_then(|line| line.split_whitespace().nth(1))
            .unwrap_or("/");

        let callback_url = Url::parse(&format!("http://127.0.0.1{target}"))
            .map_err(|_| "Callback Google invalid".to_string())?;
        if callback_url.path() != "/callback" {
            write_browser_response(
                &mut stream,
                "404 Not Found",
                "Rută necunoscută",
                "Poți închide această filă.",
            );
            continue;
        }

        let mut code = None;
        let mut returned_state = None;
        let mut oauth_error = None;
        for (key, value) in callback_url.query_pairs() {
            match key.as_ref() {
                "code" => code = Some(value.into_owned()),
                "state" => returned_state = Some(value.into_owned()),
                "error" => oauth_error = Some(value.into_owned()),
                _ => {}
            }
        }

        if let Some(error) = oauth_error {
            write_browser_response(
                &mut stream,
                "400 Bad Request",
                "Acces anulat",
                "Autentificarea nu a fost finalizată. Revino în aplicație.",
            );
            return Err(format!("Google OAuth a răspuns cu: {error}"));
        }
        if returned_state.as_deref() != Some(expected_state.as_str()) {
            write_browser_response(
                &mut stream,
                "400 Bad Request",
                "Răspuns respins",
                "Verificarea de securitate a sesiunii nu a reușit.",
            );
            return Err("Parametrul state nu corespunde sesiunii OAuth".to_string());
        }
        let code = code.ok_or_else(|| "Google nu a returnat codul de autorizare".to_string())?;
        write_browser_response(
            &mut stream,
            "200 OK",
            "Autentificare reușită",
            "Poți închide această filă și reveni în Bossnet Proceduri.",
        );
        return Ok(code);
    }

    Err("Autentificarea Google a expirat după 5 minute".to_string())
}

#[tauri::command]
async fn google_oauth_login(
    client_id: String,
    hosted_domain: String,
) -> Result<GoogleOAuthResult, String> {
    if !client_id.ends_with(".apps.googleusercontent.com") || client_id.len() > 256 {
        return Err("Google Client ID invalid".to_string());
    }
    if hosted_domain != "bossnet.ro" {
        return Err("Domeniul Google Workspace nu este permis".to_string());
    }

    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|_| "Nu am putut deschide callback-ul local OAuth".to_string())?;
    let port = listener
        .local_addr()
        .map_err(|_| "Portul callback OAuth nu este disponibil".to_string())?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let state = random_urlsafe(32);
    let nonce = random_urlsafe(32);
    let code_verifier = random_urlsafe(64);
    let code_challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(code_verifier.as_bytes()));

    let mut authorization_url = Url::parse(GOOGLE_AUTH_URL)
        .map_err(|_| "Endpoint-ul Google OAuth este invalid".to_string())?;
    authorization_url
        .query_pairs_mut()
        .append_pair("client_id", &client_id)
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile")
        .append_pair("code_challenge", &code_challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state)
        .append_pair("nonce", &nonce)
        .append_pair("hd", &hosted_domain)
        .append_pair("prompt", "select_account");

    open::that(authorization_url.as_str())
        .map_err(|_| "Browserul sistemului nu a putut fi deschis".to_string())?;

    let callback_state = state.clone();
    let authorization_code = tauri::async_runtime::spawn_blocking(move || {
        wait_for_oauth_callback(listener, callback_state)
    })
    .await
    .map_err(|_| "Procesul OAuth local a fost întrerupt".to_string())??;

    let response = reqwest::Client::new()
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("code", authorization_code.as_str()),
            ("code_verifier", code_verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect_uri.as_str()),
        ])
        .send()
        .await
        .map_err(|_| "Schimbul codului Google nu a putut fi efectuat".to_string())?;

    let status = response.status();
    let token_response = response
        .json::<GoogleTokenResponse>()
        .await
        .map_err(|_| "Răspunsul token Google este invalid".to_string())?;
    if !status.is_success() {
        return Err(token_response
            .error_description
            .or(token_response.error)
            .unwrap_or_else(|| "Google a refuzat schimbul codului OAuth".to_string()));
    }

    let id_token = token_response
        .id_token
        .filter(|token| token.len() >= 100)
        .ok_or_else(|| "Google nu a returnat un ID token".to_string())?;

    Ok(GoogleOAuthResult { id_token, nonce })
}

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
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![google_oauth_login])
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
