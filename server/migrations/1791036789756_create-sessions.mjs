export function up(pgm) {
  pgm.sql(`
    CREATE TABLE sesje (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      uzytkownik_id UUID NOT NULL
        REFERENCES uzytkownicy(id) ON DELETE CASCADE,
      skrot_tokenu CHAR(64) NOT NULL UNIQUE,
      data_utworzenia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data_wygasniecia TIMESTAMPTZ NOT NULL,
      CONSTRAINT sesja_poprawny_termin CHECK (
        data_wygasniecia > data_utworzenia
      )
    );

    CREATE INDEX sesje_uzytkownik_idx
      ON sesje (uzytkownik_id);

    CREATE INDEX sesje_wygasniecie_idx
      ON sesje (data_wygasniecia);
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TABLE sesje;
  `);
}