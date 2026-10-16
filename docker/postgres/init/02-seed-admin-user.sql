-- Default administrator for the web UI and the API
--
--   e-mail:    admin@example.com
--   password:  password123
--
-- The password is stored as an Argon2id hash (m=65536 KiB, t=3, p=4: the same parameters argon2-cffi's
-- PasswordHasher uses in the application), never as plain text.
-- Login is two-step: password, then a one-time code that is e-mailed to the user.
-- In this stack e-mail goes to Mailpit -> http://localhost:8025
INSERT INTO "user" (
    id, username, email, first_name, middle_name, last_name, id_no,
    is_active, is_superuser, security_question, security_answer, account_status, role,
    hashed_password, failed_login_attempts, last_failed_login, otp, otp_expiry_time, updated_at
) VALUES (
    '00000000-0000-4000-8000-000000000001', 'admin', 'admin@example.com', 'Admin', NULL, 'User', 100000001,
    TRUE, TRUE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'ADMIN',
    '$argon2id$v=19$m=65536,t=3,p=4$a+lxmoNw8zeFhf9Q+9P58w$B2hUfie2hc59sxVw+jGiMOBXCeeJW3/WLIlk4ebTWUI', 0, NULL, '', NULL, NOW()
)
ON CONFLICT (email) DO UPDATE SET
    hashed_password = EXCLUDED.hashed_password,
    role = 'ADMIN',
    is_active = TRUE,
    account_status = 'ACTIVE',
    failed_login_attempts = 0;
