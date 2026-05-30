# ContentFlow uitleg voor Kaj

## Wat we organisatorisch veranderen

ContentFlow is geen losse SEO-generator meer. Het wordt een interne Turn.One contentcockpit.

Dat betekent:

- Je begint met 1 briefing: wat wil je maken?
- Daarna kies je 1 vorm: Websitecopy, LinkedIn, SEO of Topic authority.
- De tool haalt context op de achtergrond op: merk, tone-of-voice, kennisbank, feedbackregels en eventueel Hermes.
- De output krijgt een vorm die past bij het doel. Een LinkedIn-post ziet dus niet meer uit als een SEO-artikel.
- Na de output toont ContentFlow een kwaliteitscontrole, zodat je begrijpt waarom iets goed of nog zwak is.

De belangrijkste waarheid: minder knoppen, meer duidelijke flow.

## Wat HTML doet

HTML is het scherm.

Daar staan:

- het grote invoerveld
- de vier outputkeuzes
- de contextvelden
- de output
- de feedbackknoppen
- de kwaliteitskaart

HTML schrijft niet zelf slim. HTML verzamelt jouw input en laat het resultaat zien.

## Wat TypeScript en Netlify doen

TypeScript is de keuken.

Als jij op de knop klikt, stuurt HTML een request naar een Netlify Function. Die function leest:

- welke output je gekozen hebt
- je briefing
- je onderwerp
- je CTA
- de bedrijfscontext
- de opgeslagen Supabase-context

Daarna maakt TypeScript een betere prompt voor OpenAI. Nieuw is dat TypeScript nu echt snapt of je Websitecopy, LinkedIn, SEO of Topic authority wilt.

## Wat Supabase doet

Supabase is het geheugen.

Daar staan bijvoorbeeld:

- generation jobs
- kennisbank-items
- feedbackregels
- merkcontext
- tone-of-voice

Dus als jij feedback geeft zoals "gebruik dit woord niet", dan kan de backend dat later weer meenemen.

## Wat Hermes en OpenAI doen

OpenAI schrijft of analyseert.

Hermes is een extra slimme agent die vooral handig is voor website- en topic-analyse. Bijvoorbeeld:

- welke onderwerpen ontbreken?
- welke supportpagina's heb je nodig?
- welke interne links zijn logisch?
- welke vragen stelt de doelgroep?

In de nieuwe flow moet Hermes minder voelen als losse knop en meer als stille motor op de achtergrond.

## Wat vandaag is verbeterd

- De hoofdflow gebruikt nu vier duidelijke outputtypes: Websitecopy, LinkedIn, SEO en Topic authority.
- Topic authority loopt via de hoofdknop en maakt een expertkaart, niet een normale tekst.
- De TypeScript-backend herkent het outputtype en geeft OpenAI andere instructies per type.
- De kwaliteitscontrole rekent LinkedIn niet meer af alsof het een lange SEO-pagina moet zijn.
- De oude verborgen homepage-mini-tool is uit de HTML gehaald.
- De output toont nu een kwaliteitskaart per outputtype.

## Volgende stappen

1. Test elk outputtype met echte Turn.One input.
2. Kijk of LinkedIn echt menselijk klinkt.
3. Kijk of Websitecopy binnen 5 seconden duidelijk is.
4. Kijk of SEO genoeg zoekintentie, bewijs en CTA bevat.
5. Kijk of Topic authority echt een bruikbare contentroute geeft.
6. Geef feedback en controleer of Supabase die feedback onthoudt.

Kort gezegd: ContentFlow moet niet meer "meer AI" voelen, maar "betere denkrichting met minder chaos".
