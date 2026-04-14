// NOTE: Console is intentionally kept visible for debugging.
// Once the app launch issue is resolved, restore:
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![windows_subsystem = "console"]

fn main() {
  println!("Zeneva: Booting main process...");
  
  std::panic::set_hook(Box::new(|panic_info| {
      let payload = panic_info.payload();
      let message = if let Some(s) = payload.downcast_ref::<&str>() {
          *s
      } else if let Some(s) = payload.downcast_ref::<String>() {
          &s[..]
      } else {
          "Unknown panic message"
      };

      eprintln!("\n**************************************************");
      eprintln!("ZENEVA FATAL PANIC OCCURRED!");
      eprintln!("Error: {}", message);
      if let Some(loc) = panic_info.location() {
          eprintln!("At: {}:{}:{}", loc.file(), loc.line(), loc.column());
      }
      eprintln!("**************************************************");
      eprintln!("\nThe application has crashed. Please copy the error above.");
      eprintln!("Press Enter to exit...");
      let mut input = String::new();
      let _ = std::io::stdin().read_line(&mut input);
  }));

  // Catch the case where run returns (though usually it panics on error)
  app_lib::run();

  println!("\nZeneva: Backend run completed (Normal Exit).");
  println!("Press Enter to close this window...");
  let mut input = String::new();
  let _ = std::io::stdin().read_line(&mut input);
}
