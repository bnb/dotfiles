use std::io::{self, ErrorKind};
use std::process::ExitCode;

use clap::Parser;

fn main() -> ExitCode {
    let cli = coord::cli::Cli::parse();
    let Err(err) = coord::run(cli, &mut io::stdout().lock()) else {
        return ExitCode::SUCCESS;
    };
    // `coord census | head` closing the pipe early isn't a failure worth reporting.
    let closed_pipe = err.downcast_ref::<io::Error>().is_some_and(|e| e.kind() == ErrorKind::BrokenPipe);
    if closed_pipe {
        return ExitCode::SUCCESS;
    }
    eprintln!("coord: {err:#}");
    ExitCode::from(2)
}
