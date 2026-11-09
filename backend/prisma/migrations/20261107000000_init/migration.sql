BEGIN;

CREATE TABLE professional_links (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL
);

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE work_experience (
    id SERIAL PRIMARY KEY,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    achievements TEXT[] NOT NULL,
    CONSTRAINT work_experience_start_date_format
        CHECK (start_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT work_experience_end_date_format
        CHECK (end_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL
);

COMMIT;
