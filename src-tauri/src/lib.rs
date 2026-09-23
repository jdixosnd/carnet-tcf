use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create user tables",
        sql: "CREATE TABLE cards (word TEXT PRIMARY KEY, box INTEGER NOT NULL, due INTEGER NOT NULL, right INTEGER NOT NULL DEFAULT 0, wrong INTEGER NOT NULL DEFAULT 0, first_day INTEGER NOT NULL, last_day INTEGER NOT NULL);
              CREATE INDEX cards_due ON cards(due);
              CREATE TABLE history (day INTEGER PRIMARY KEY, reviewed INTEGER NOT NULL DEFAULT 0, remembered INTEGER NOT NULL DEFAULT 0, new_words INTEGER NOT NULL DEFAULT 0);
              CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
              CREATE TABLE extra_today (word TEXT PRIMARY KEY, day INTEGER NOT NULL);",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:carnet.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Carnet TCF");
}
