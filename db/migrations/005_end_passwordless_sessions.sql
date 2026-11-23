-- Sessions created before passwords existed were email-only. End them all; everyone signs in again with a password.
delete from sessions;
