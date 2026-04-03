-- Party founders stay voters in the session model; normalize legacy rows.
UPDATE "User" SET role = 'VOTER' WHERE role = 'PARTY_REP';
