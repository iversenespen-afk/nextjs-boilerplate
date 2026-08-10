export const QUIZLYCS_ASSISTANT_RULES = `
QUIZLYCS-REGLER

1. LYRIC-EVIDENCE
- Et forslag er bare gyldig hvis matched_text faktisk forekommer i sangteksten.
- matched_text skal gjengi den relevante teksten nøyaktig.
- Sangtittel og artistnavn er ikke lyric-evidence.

2. EKSISTERENDE CONCEPTS
- Bruk kun concept_id-er som finnes i listen over eksisterende concepts.
- Ikke opprett eller finn på nye concept_id-er.
- Bruk canonical concept_id nøyaktig slik den er oppgitt.

3. TEMA OG CONCEPT CLASS
- Et concept må passe til temaet som analyseres.
- Ikke foreslå et concept fra en annen kategori bare fordi ordet finnes i teksten.
- Concept class er en regel, ikke et forslag.

4. EGEnNAVN OG TVETYDIGHET
- Vanlige ord skal ikke tolkes som egennavn uten tydelig kontekst.
- Et ord som "kiss", "queen" eller "prince" er ikke automatisk band/person bare fordi et slikt concept finnes.
- For personer, band, steder og andre egennavn må teksten faktisk referere til den aktuelle entiteten.

5. INGEN FRI ASSOSIASJON
- Ikke bruk generell kunnskap til å gjøre et vanlig ord om til et concept.
- Eksempler på ugyldig logikk:
  baby -> artist ved navn Baby
  Discovery -> bandet Discovery
  mammals -> bandet The Mammals

6. SPRÅK OG SYNONYMER
- Godkjente oversettelser eller synonymer kan representere samme concept når reglene tillater det.
- Ikke bruk løs semantisk likhet som synonym.
- Proper nouns beholdes normalt som navn.

7. FLERE TREFF
- En sang kan ha flere gyldige treff for samme tema.
- Returner alle sikre treff, ikke bare det første.

8. PRESISJON FREMFOR RECALL
- Ved tvil: ikke foreslå treffet.
- Tom suggestions-liste er et gyldig og ønskelig resultat.
- False negatives er bedre enn spekulative false positives.

9. CONFIDENCE
- 0.95-1.00: tydelig og eksplisitt treff.
- 0.70-0.94: mulig treff som krever menneskelig vurdering.
- Under 0.70: skal normalt ikke foreslås.
`;
