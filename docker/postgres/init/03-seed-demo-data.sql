-- DEMO DATA so every part of the application can be exercised straight away.
-- Safe to delete this file for a clean installation (the admin user lives in 02-seed-admin-user.sql).
--
-- All demo users have the password  password123
--   executive@example.com  account_executive  activates accounts / cards, reviews flagged transactions
--   teller@example.com     teller             cash deposits and withdrawals
--   manager@example.com    branch_manager     can list every customer profile
--   alice@example.com      customer           USD account 4200000000000001 (balance 5,000.00)
--   bob@example.com        customer           USD account 4200000000000002 (balance 1,500.00)
-- Security answer of every demo user (used to authorise transfers): Lagos

INSERT INTO "user" (
    id, username, email, first_name, middle_name, last_name, id_no, is_active, is_superuser,
    security_question, security_answer, account_status, role, hashed_password, failed_login_attempts, otp, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000002', 'executive', 'executive@example.com', 'Eve', NULL, 'Executive', 100000002, TRUE, FALSE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'ACCOUNT_EXECUTIVE', '$argon2id$v=19$m=65536,t=3,p=4$Rj7K3zTlli+3DdARc1OwWA$WRNYlLCfZhX3kLk5qUtNiwe2yNTfBaU1pHMrxwhbznI', 0, '', NOW()),
    ('00000000-0000-4000-8000-000000000003', 'teller', 'teller@example.com', 'Tom', NULL, 'Teller', 100000003, TRUE, FALSE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'TELLER', '$argon2id$v=19$m=65536,t=3,p=4$+XhFV8y0PQpCOaCRYGShTw$XMXd+yleXYvh+JGYwMOhpN7MP1WJKtn/LvET9sBmK7Y', 0, '', NOW()),
    ('00000000-0000-4000-8000-000000000004', 'manager', 'manager@example.com', 'Mary', NULL, 'Manager', 100000004, TRUE, FALSE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'BRANCH_MANAGER', '$argon2id$v=19$m=65536,t=3,p=4$z+0we/DrmWUxYwxI1V9kVQ$GyfocC0HisTIcXyYBL/z/4gN+VuR2GBa990bU0D8DeA', 0, '', NOW()),
    ('00000000-0000-4000-8000-000000000005', 'alice', 'alice@example.com', 'Alice', NULL, 'Johnson', 100000005, TRUE, FALSE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'CUSTOMER', '$argon2id$v=19$m=65536,t=3,p=4$/TAZoSzhdGmD2kbRvk85Ow$YRdfPtQb6f1qHW7ilcujD0CR16LxFyHNGaegqc9w2NM', 0, '', NOW()),
    ('00000000-0000-4000-8000-000000000006', 'bob', 'bob@example.com', 'Bob', NULL, 'Williams', 100000006, TRUE, FALSE, 'BIRTH_CITY', 'Lagos', 'ACTIVE', 'CUSTOMER', '$argon2id$v=19$m=65536,t=3,p=4$N+GdDmUToK12m+XP85D2PQ$5RAn+wYLQI9PwUX2p49msgBBeljZvEfQ8vCFXfwBIho', 0, '', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO profile (
    id, user_id, title, gender, date_of_birth, country_of_birth, place_of_birth, marital_status,
    means_of_identification, id_issue_date, id_expiry_date, passport_number, nationality, phone_number,
    address, city, country, employment_status, employer_name, employer_address, employer_city, employer_country,
    annual_income, date_of_employment, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000005', 'Mrs', 'Female', '1990-04-12', 'Nigeria', 'Lagos', 'Married', 'National_ID', '2020-01-15', '2030-01-15', 'A00000105', 'Nigerian', '+2348031234505', '12 Marina Road', 'Lagos', 'Nigeria', 'Employed', 'Acme Ltd', '1 Business Way', 'Lagos', 'Nigeria', 60000, '2015-06-01', NOW()),
    ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000006', 'Mr', 'Male', '1988-09-03', 'Nigeria', 'Lagos', 'Single', 'National_ID', '2020-01-15', '2030-01-15', 'A00000106', 'Nigerian', '+2348031234506', '7 Allen Avenue', 'Lagos', 'Nigeria', 'Employed', 'Acme Ltd', '1 Business Way', 'Lagos', 'Nigeria', 60000, '2015-06-01', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO nextofkin (
    id, user_id, full_name, relationship, email, phone_number, address, city, country, nationality, is_primary, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000005', 'Sam Johnson', 'Spouse', 'next.of.kin@example.com', '+2348031234599', '12 Marina Road', 'Lagos', 'Nigeria', 'Nigerian', TRUE, NOW()),
    ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000006', 'Rita Williams', 'Parent', 'next.of.kin@example.com', '+2348031234599', '12 Marina Road', 'Lagos', 'Nigeria', 'Nigerian', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO bankaccount (
    id, user_id, account_type, currency, account_status, account_number, account_name, balance, is_primary,
    kyc_submitted, kyc_verified, kyc_verified_by, kyc_verified_on, interest_rate, updated_at
) VALUES
    ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000005', 'Savings', 'USD', 'Active',
     '4200000000000001', 'Alice Johnson - Savings', 5000.00, TRUE, TRUE, TRUE,
     '00000000-0000-4000-8000-000000000002', NOW(), 2.5, NOW()),
    ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000006', 'Current', 'USD', 'Active',
     '4200000000000002', 'Bob Williams - Current', 1500.00, TRUE, TRUE, TRUE,
     '00000000-0000-4000-8000-000000000002', NOW(), 0.0, NOW())
ON CONFLICT (id) DO NOTHING;
