/**
 * Connection config consumed by `sequelize-cli` (migrations/seeders).
 * Deliberately plain CommonJS + minimal validation (not the zod schema in
 * `src/config/env.ts`) because the CLI runs standalone via `node`, outside
 * the app's TypeScript build.
 */
require("dotenv/config");

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

const base = {
  username: required("DB_USER"),
  password: required("DB_PASSWORD"),
  database: required("DB_NAME"),
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  dialectOptions:
    process.env.DB_SSL === "true"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
