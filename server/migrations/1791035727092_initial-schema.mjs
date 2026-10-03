export function up(pgm) {
  pgm.sql(`
    CREATE TABLE uzytkownicy (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(254) NOT NULL UNIQUE,
      skrot_hasla TEXT NOT NULL,
      data_utworzenia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT email_normalized CHECK (
        email = LOWER(BTRIM(email)) AND email <> ''
      )
    );

    CREATE TABLE portfele (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      uzytkownik_id UUID NOT NULL UNIQUE
        REFERENCES uzytkownicy(id) ON DELETE RESTRICT
    );

    CREATE TABLE waluty (
      kod CHAR(3) PRIMARY KEY,
      nazwa VARCHAR(100) NOT NULL,
      CONSTRAINT kod_waluty_format CHECK (
        kod ~ '^[A-Z]{3}$'
      )
    );

    CREATE TABLE salda_walut (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      portfel_id UUID NOT NULL
        REFERENCES portfele(id) ON DELETE RESTRICT,
      kod_waluty CHAR(3) NOT NULL
        REFERENCES waluty(kod) ON DELETE RESTRICT,
      kwota DECIMAL(19,2) NOT NULL DEFAULT 0,
      CONSTRAINT saldo_nieujemne CHECK (
        kwota >= 0 AND kwota <> 'NaN'::numeric
      ),
      CONSTRAINT saldo_portfel_waluta_unique
        UNIQUE (portfel_id, kod_waluty)
    );
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TABLE salda_walut;
    DROP TABLE waluty;
    DROP TABLE portfele;
    DROP TABLE uzytkownicy;
  `);
}