fn main() {
  std::panic::set_hook(Box::new(|panic_info| {
      eprintln!("Zeneva Fatal Error: {:?}", panic_info);
      eprintln!("\nPlease report this error.");
      eprintln!("The application will stay open so you can read the error above.");
      eprintln!("Press any key or close this window to exit.");
      let mut input = String::new();
      let _ = std::io::stdin().read_line(&mut input);
  }));

  app_lib::run();
}
