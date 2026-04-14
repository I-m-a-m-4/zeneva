fn main() {
  println!("Zeneva: Booting main process...");
  
  std::panic::set_hook(Box::new(|panic_info| {
      eprintln!("\n**************************************************");
      eprintln!("ZENEVA FATAL PANIC OCCURRED!");
      eprintln!("{:?}", panic_info);
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
