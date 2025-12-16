use chrono::{DateTime, Datelike, Local};
use std::fs;
use std::io::Write;
use std::path::Path;

const START_TIME_FILE: &str = "start_time.txt";

fn main() {
    let start_time = load_or_create_start_time();
    let now = Local::now();

    let worked = (now - start_time).num_seconds() as f64 / 3600.0;

    let required = match start_time.weekday() {
        chrono::Weekday::Mon | chrono::Weekday::Tue => 9.25,
        _ => 8.25,
    };

    let remaining = (required - worked).max(0.0);

    println!(
        "Work Time: {:.2}h worked | {:.2}h remaining",
        worked, remaining
    );
}

fn load_or_create_start_time() -> DateTime<Local> {
    let path = Path::new(START_TIME_FILE);

    if path.exists() {
        let contents = fs::read_to_string(path)
            .expect("Failed to read start time file");

        DateTime::parse_from_rfc3339(contents.trim())
            .expect("Invalid timestamp")
            .with_timezone(&Local)
    } else {
        let now = Local::now();
        let mut file = fs::File::create(path)
            .expect("Failed to create start time file");

        writeln!(file, "{}", now.to_rfc3339()).unwrap();
        now
    }
}
