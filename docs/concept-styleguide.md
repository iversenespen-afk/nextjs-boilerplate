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

## 2. Concept-ID

`concept_id` er den tekniske identiteten til et begrep.

Regler:

- små bokstaver
- ord skilles med underscore (`_`)
- ingen mellomrom
- ingen spesialtegn
- språk-uavhengig
- ID-en skal aldri endres selv om visningsnavnet endres
- concept_id er standard entall (f.eks. eye, ikke eyes)
- Samme concept_id skal aldri representere to forskjellige betydninger. Hvis en kollisjon faktisk oppstår, oppretter vi en ny concept_id med et beskrivende suffiks.

Tema: Musikere (KISS)
concept_id = kiss_artist

Tema: Handlinger (kiss)
concept_id = kiss_action

### Eksempler

| Visningsnavn | concept_id |
|--------------|------------|
| Britney Spears | `britney_spears` |
| Kurt Cobain | `kurt_cobain` |
| Johnny Cash | `johnny_cash` |
| West Virginia | `west_virginia` |
| Coca-Cola | `coca_cola` |

## 3. matched_text

`matched_text` skal alltid være nøyaktig det som synges i sangen.

Det skal **ikke** oversettes, normaliseres eller tilpasses.

### Eksempler

| Det som synges | matched_text | concept_id |
|----------------|--------------|------------|
| "Britney" | Britney | britney_spears |
| "skinn" | skinn | hud |
| "Eyes" | Eyes | eye |
| "Moon" | Moon | moon |
| "California" | California | california |

### Viktig

`matched_text` brukes som dokumentasjon på hva som faktisk finnes i teksten.

Det er **ikke** teksten som vises til spilleren i quizen.

## 4. label_no og label_en

`label_no` og `label_en` er visningsnavnene som brukes i Quizlix.

Spilleren skal alltid se `label_xx`, aldri `matched_text`.

### Regler

- `label_no` er norsk visningsnavn.
- `label_en` er engelsk visningsnavn.
- Egennavn oversettes normalt ikke.
- Vanlige substantiver oversettes.
- `matched_text` skal aldri brukes som svaralternativ.

### Eksempler

| concept_id | matched_text | label_no | label_en |
|------------|--------------|----------|----------|
| britney_spears | Britney | Britney Spears | Britney Spears |
| hud | skinn | Hud | Skin |
| eye | Eyes | Øye | Eye |
| moon | Moon | Måne | Moon |
| willow | willow tree | Pil | Willow |

### Eksempel

Engelsk sang:

matched_text = Eyes

↓

concept_id = eye

↓

label_no = Øye

↓

label_en = Eye

Quizlix viser:

- norsk spiller → **Øye**
- engelsk spiller → **Eye**

## 5. Synonymer og ordformer

Flere ord eller uttrykk kan representere samme concept.

Alle slike varianter skal peke til samme `concept_id`.

### Eksempler

| matched_text | concept_id |
|--------------|------------|
| Britney | britney_spears |
| Britney Spears | britney_spears |
| Jay | jay_z |
| Jay-Z | jay_z |
| skinn | hud |
| skin | hud |
| willow tree | willow |
| willow | willow |

### Entall og flertall

Entall og flertall skal normalt bruke samme `concept_id`.

Eksempler:

| matched_text | concept_id |
|--------------|------------|
| eye | eye |
| eyes | eye |
| øye | eye |
| øyne | eye |

| matched_text | concept_id |
|--------------|------------|
| hand | hand |
| hands | hand |

| matched_text | concept_id |
|--------------|------------|
| finger | finger |
| fingers | finger |

### Prinsipp

`concept_id` beskriver **hva begrepet er**, ikke hvordan det er skrevet i teksten.

## 6. Egennavn og oversettelser

Egennavn skal normalt **ikke oversettes**.

Dette gjelder blant annet:

- personer
- band
- artister
- skuespillere
- planeter
- Star Wars-planeter
- byer
- delstater
- land
- merkevarer

### Eksempler

| concept_id | label_no | label_en |
|------------|----------|----------|
| britney_spears | Britney Spears | Britney Spears |
| michael_bolton | Michael Bolton | Michael Bolton |
| beatles | Beatles | Beatles |
| kiss | KISS | KISS |
| queen | Queen | Queen |
| naboo | Naboo | Naboo |
| alderaan | Alderaan | Alderaan |
| coca_cola | Coca-Cola | Coca-Cola |
| california | California | California |
| texas | Texas | Texas |

### Vanlige substantiver oversettes

Vanlige ord skal oversettes til spillerens språk.

| concept_id | label_no | label_en |
|------------|----------|----------|
| eye | Øye | Eye |
| lung | Lunge | Lung |
| willow | Pil | Willow |
| oak | Eik | Oak |
| guitar | Gitar | Guitar |
| moon | Måne | Moon |

### Gråsoner

Noen ord kan bety forskjellige ting avhengig av sammenhengen.

Eksempler:

| Ord | Betydning |
|------|-----------|
| KISS | Bandet KISS |
| Prince | Artisten Prince |
| Queen | Bandet Queen eller dronning |
| Europe | Bandet Europe eller verdensdelen Europa |
| Giant Squid | Band eller dyreart |

I slike tilfeller avgjør **temaet** hvilken betydning som skal brukes.

## 7. Temaer

Et concept kan tilhøre ett eller flere temaer.

Eksempler:

| Concept | Tema |
|----------|------|
| Britney Spears | Musikere |
| Brad Pitt | Skuespillere |
| Johnny Depp | Skuespillere (primært) |
| Johnny Depp | Musikere (sekundært) |
| USA | Land |
| California | Delstater |
| Naboo | Star Wars-planeter |

Primærtema brukes som standard.

Sekundære temaer kan legges til senere dersom det er nyttig.

## 8. Grunnregel

Ved tvil skal Quizlix alltid velge den løsningen som virker mest naturlig for en vanlig quizdeltaker.

Målet er ikke å være akademisk korrekt i alle tilfeller, men å gi en rettferdig og intuitiv quizopplevelse.

## Fremtidige forbedringer

Planlagte forbedringer:

- støtte for flere temaer per concept
- AI-forslag basert på lyrics
- flere språk
- synonymdatabase
- admin-søk etter concepts
- automatisk oversettelse av label_no / label_en
- revisjonshistorikk på concepts
