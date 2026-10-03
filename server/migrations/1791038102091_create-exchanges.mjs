export function up(pgm) {
  pgm.sql(`
    CREATE TABLE transakcje (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      portfel_id UUID NOT NULL
        REFERENCES portfele(id) ON DELETE RESTRICT,

      identyfikator_zadania UUID NOT NULL,

      waluta_zrodlowa CHAR(3) NOT NULL
        REFERENCES waluty(kod) ON DELETE RESTRICT,

      waluta_docelowa CHAR(3) NOT NULL
        REFERENCES waluty(kod) ON DELETE RESTRICT,

      kwota_zrodlowa DECIMAL(19,2) NOT NULL,
      kwota_docelowa DECIMAL(19,2) NOT NULL,

      kurs DECIMAL(19,8) NOT NULL,
      typ_kursu VARCHAR(3) NOT NULL,
      numer_tabeli VARCHAR(50) NOT NULL,
      data_kursu DATE NOT NULL,

      data_utworzenia TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT transakcja_zadanie_unique
        UNIQUE (portfel_id, identyfikator_zadania),

      CONSTRAINT transakcja_kwoty_dodatnie CHECK (
        kwota_zrodlowa > 0
        AND kwota_zrodlowa <> 'NaN'::numeric
        AND kwota_docelowa > 0
        AND kwota_docelowa <> 'NaN'::numeric
      ),

      CONSTRAINT transakcja_kurs_dodatni CHECK (
        kurs > 0 AND kurs <> 'NaN'::numeric
      ),

      CONSTRAINT transakcja_para_i_typ_kursu CHECK (
        (
          waluta_zrodlowa = 'PLN'
          AND waluta_docelowa IN ('EUR', 'USD', 'GBP')
          AND typ_kursu = 'ask'
        )
        OR
        (
          waluta_zrodlowa IN ('EUR', 'USD', 'GBP')
          AND waluta_docelowa = 'PLN'
          AND typ_kursu = 'bid'
        )
      )
    );

    CREATE INDEX transakcje_portfel_data_idx
      ON transakcje (portfel_id, data_utworzenia DESC, id DESC);
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TABLE transakcje;
  `);
}