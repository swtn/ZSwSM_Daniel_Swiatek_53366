export function up(pgm) {
  pgm.sql(`
    INSERT INTO waluty (kod, nazwa)
    VALUES
      ('PLN', 'Złoty polski'),
      ('EUR', 'Euro'),
      ('USD', 'Dolar amerykański'),
      ('GBP', 'Funt szterling');
  `);
}

export function down(pgm) {
  pgm.sql(`
    DELETE FROM waluty
    WHERE kod IN ('PLN', 'EUR', 'USD', 'GBP');
  `);
}