// Loads apps/api/.env into process.env before any test file runs.
// dotenv is a no-op when a var is already set, so docker compose and CI
// secrets continue to take precedence over the local .env file.
import 'dotenv/config'
