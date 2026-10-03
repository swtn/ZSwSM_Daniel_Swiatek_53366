export function up(pgm) {
  pgm.sql(`
    CREATE TABLE wplaty (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      portfel_id UUID NOT NULL
        REFERENCES portfele(id) ON DELETE RESTRICT,

      identyfikator_zadania UUID NOT NULL,

      kwota DECIMAL(19,2) NOT NULL,

      data_utworzenia TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT wplata_kwota_dodatnia CHECK (
        kwota > 0 AND kwota <> 'NaN'::numeric
      ),

      CONSTRAINT wplata_zadanie_unique
        UNIQUE (portfel_id, identyfikator_zadania)
    );

    CREATE INDEX wplaty_portfel_data_idx
      ON wplaty (portfel_id, data_utworzenia DESC);
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TABLE wplaty;
  `);
}