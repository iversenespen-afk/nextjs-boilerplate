# Quizlix Concept Styleguide

Denne guiden beskriver reglene for hvordan concepts, themes og lyrics skal registreres i Quizlix.

Målet er å holde databasen konsistent slik at:
- samme begrep alltid får samme concept
- spørsmålene blir intuitive
- databasen kan brukes på flere språk
- AI kan trenes på et konsistent datasett

---

## 1. Grunnprinsipp

Et sangtreff består alltid av fire ting:

| Felt | Betydning |
|------|-----------|
| matched_text | Det som faktisk synges |
| concept_id | Den tekniske identiteten |
| label_no | Norsk visningsnavn |
| label_en | Engelsk visningsnavn |
