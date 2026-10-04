export function up(pgm) {
  pgm.sql(`
    ALTER TABLE uzytkownicy
      ADD COLUMN imie VARCHAR(100),
      ADD COLUMN nazwisko VARCHAR(100),
      ADD CONSTRAINT imie_poprawne CHECK (
        imie IS NULL OR (imie = BTRIM(imie) AND imie <> '')
      ),
      ADD CONSTRAINT nazwisko_poprawne CHECK (
        nazwisko IS NULL OR (nazwisko = BTRIM(nazwisko) AND nazwisko <> '')
      );
  `);
}

export function down(pgm) {
  pgm.sql(`
    ALTER TABLE uzytkownicy
      DROP COLUMN nazwisko,
      DROP COLUMN imie;
  `);
}
