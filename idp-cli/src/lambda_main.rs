use idp_cli::lambda_handler::run_lambda;

#[tokio::main]
async fn main() -> Result<(), lambda_http::Error> {
    run_lambda().await
}
