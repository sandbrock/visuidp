-- Database initialization script for local development
-- This script creates the necessary database and user for the IDP REST API

-- Create user (only if it doesn't exist)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idp_user') THEN
--         CREATE USER postgres WITH PASSWORD 'idp_password';
--     END IF;
-- END
-- $$;

-- Create database (only if it doesn't exist)
SELECT 'CREATE DATABASE idp_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'idp_db')\gexec

-- Grant permissions
-- GRANT ALL PRIVILEGES ON DATABASE idp_db TO idp_user;