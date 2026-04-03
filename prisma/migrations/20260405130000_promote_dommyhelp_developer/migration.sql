-- Promote dommyhelp@gmail.com to developer dock access (User.isAdministrator).
-- Safe no-op if the row does not exist yet (register first, then re-run migrate or run UPDATE manually).
UPDATE "User" SET "isAdministrator" = true WHERE LOWER("email") = LOWER('dommyhelp@gmail.com');
