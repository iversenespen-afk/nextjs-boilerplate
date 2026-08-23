export const QUIZLYCS_ASSISTANT_RULES = `
QUIZLYCS-REGLER

1. LYRIC-EVIDENCE
- Et forslag er bare gyldig hvis matched_text faktisk forekommer i sangteksten.
- matched_text skal gjengi den relevante teksten nøyaktig.
- Sangtittel og artistnavn er ikke lyric-evidence.

2. EKSISTERENDE OG NYE CONCEPTS
- Sjekk alltid eksisterende concepts først.
- Hvis et eksisterende concept representerer treffet, SKAL dette brukes.
- Ikke foreslå et nytt concept dersom et passende eksisterende concept finnes.
- Hvis sangteksten inneholder et tydelig og relevant treff som ikke finnes blant eksisterende concepts, kan du foreslå et NYTT concept.
- Nye concepts skal markeres med existing_concept = false.
- Eksisterende concepts skal markeres med existing_concept = true.
- For nye concepts skal concept_id være et kort canonical id i små bokstaver med underscore, for eksempel dr_dre eller tommy_lee.
- Et nytt concept er kun et forslag. Det skal aldri behandles som allerede godkjent eller eksisterende.

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

8. PRESISJON OG REVIEW
- Vær konservativ, men returner også plausible treff som kan være interessante for menneskelig review.
- Ikke skjul et plausibelt treff bare fordi det er usikkert.
- Spekulative treff uten reell støtte i sangteksten skal fortsatt utelates.
- Tom suggestions-liste er et gyldig resultat når ingen plausible treff finnes.

9. CONFIDENCE
- 0.90-1.00: svært sikkert treff.
- 0.70-0.89: sannsynlig treff som bør vurderes av menneske.
- 0.50-0.69: usikkert, men plausibelt treff som kan være interessant i review.
- Under 0.50: skal normalt ikke foreslås.
- Confidence skal uttrykke hvor sikker analysen er, ikke brukes til å skjule plausible treff.

10. CANONICAL CONCEPT ID OG SPRÅKNORMALISERING

- matched_text skal bevare ordet eller uttrykket slik det faktisk forekommer i sangteksten.
- concept_id skal representere det kanoniske konseptet, ikke nødvendigvis språkformen som synges.
- For geografiske egennavn skal concept_id som hovedregel baseres på kanonisk engelsk navn, lowercase og underscore ved behov.
- display_name skal bruke det kanoniske navnet som bør vises i review.

Eksempler:
- "Tokio" i teksten → concept_id "tokyo", display_name "Tokyo", matched_text "Tokio".
- "La Habana" i teksten → concept_id "havana", display_name "Havana", matched_text "La Habana".
- Ikke opprett "tokio" dersom konseptet egentlig er Tokyo.
- Ikke opprett "la_habana" dersom konseptet egentlig er Havana.

11. GEOGRAFISK KLASSIFISERING

- Ikke anta at alle stedsnavn i temaet Byer er byer.
- Klassifiser hva stedet faktisk er.
- En bydel, et strøk, en landsby eller et distrikt skal ikke beskrives som en by bare fordi review-itemets tema er Byer.
- Eksempler:
  - Tokyo → city/place.
  - Havana → city/place.
  - Kragerø → town/city/place.
  - Romsås → neighborhood/place.
  - Holmlia → neighborhood/place.
- Quiztema og concept_class er separate ting. Et concept kan være spillbart under et bredt stedstema selv om concept_class ikke er city.

12. SPRÅKLABELS

- Nye concepts skal bruke korrekt kanonisk navn, ikke ukritisk kopiere matched_text til concept-navnet.
- Når en etablert språkform er kjent, bruk den korrekte språkformen for norsk, engelsk, dansk, svensk, tysk og spansk.
- Proper nouns kan være identiske mellom språk, men kjente lokale former skal beholdes.
- Eksempler:
  - Havana: norsk "Havanna", engelsk "Havana", spansk "La Habana".
  - Tokyo: norsk/engelsk/dansk/svensk "Tokyo", tysk/spansk "Tokio".
`;
