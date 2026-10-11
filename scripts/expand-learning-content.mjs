import { readFileSync, writeFileSync } from 'node:fs';
import { courseNotes } from './course-notes.mjs';
import { falseChecks } from './concept-checks.mjs';

// Stable IDs keep existing drafts, completions and streak events intact.
const courses = {
  web: [
    [
      'web-semantic',
      'structure',
      '<header>…</header>\n<main><article>…</article></main>\n<footer>…</footer>',
    ],
    [
      'web-layout',
      'compare',
      '.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }',
    ],
    [
      'web-forms',
      'test',
      '<label for="email">Email</label>\n<input id="email" type="email" required>\n// test: "", "ada", "ada@example.test"',
    ],
    [
      'web-dom',
      'sequence',
      'const button = document.querySelector("button");\nbutton.addEventListener("click", () => {\n  document.querySelector("p").textContent = "✓";\n});',
    ],
    [
      'web-access',
      'feedback',
      '<button type="button">✓</button>\n// Tab → Enter → ✓\n// contrast: 4.5:1',
    ],
    [
      'web-debug',
      'test',
      'const total = (price, quantity) => price * quantity;\n// total(5, 3) → 15\n// total(5, 0) → 0',
    ],
    [
      'web-project',
      'project',
      '<!doctype html>\n<html lang="en">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <main>…</main>\n</html>',
    ],
  ],
  data: [
    ['data-clean', 'structure', 'id,value\n1,10\n2,\n2,20\n3,30\n// duplicate id: 2; missing ≠ 0'],
    [
      'data-measures',
      'formula',
      '(10 + 20 + 30) / 3 = 20\nmedian(10, 20, 90) = 20\nmean(10, 20, 90) = 40',
    ],
    ['data-sheets', 'formula', '=SUM(B2:B4)\n=AVERAGE(B2:B4)\n=COUNT(B2:B4)\n// B2:B4 = 10,20,30'],
    [
      'data-filter',
      'compare',
      'id,region,value\n1,A,10\n2,B,30\n3,A,20\n// region=A → 1,3; value descending → 2,3,1',
    ],
    ['data-charts', 'compare', 'A: ███ 30\nB: ██ 20\nC: █ 10\n// axis starts at 0; same unit'],
    [
      'data-sql',
      'structure',
      'SELECT region, SUM(value) AS total\nFROM sales\nGROUP BY region;\n// A → 30; B → 30',
    ],
    [
      'data-privacy',
      'privacy',
      '{"person_id":"P01","age_band":"20–29","value":10}\n// remove: name, email, phone',
    ],
    ['data-evidence', 'feedback', 'n = 3\nmean = 20\nrange = 10–30\n// correlation ≠ causation'],
    [
      'data-project',
      'project',
      'CSV → clean → calculate → chart → recommendation\n10,20,30 → 20 → ███ → ?',
    ],
  ],
  cyber: [
    [
      'cyber-phishing',
      'risk',
      'https://example.test\nhttps://example.test.evil.test\n// host: example.test ≠ example.test.evil.test',
    ],
    [
      'cyber-privacy',
      'privacy',
      '{"account":"test-01","password":"[REDACTED]","mfa_code":"[REDACTED]"}',
    ],
    ['cyber-updates', 'sequence', 'backup → official update → restart → version check'],
    [
      'cyber-network',
      'structure',
      'device → router → DNS → HTTPS server\n// HTTPS protects transit; does not guarantee honesty',
    ],
    [
      'cyber-permissions',
      'compare',
      'viewer: read\neditor: read + write\nadmin: read + write + manage\n// role = minimum needed',
    ],
    [
      'cyber-backup',
      'test',
      '3 copies · 2 storage types · 1 off-site\n// restore a test file; compare contents',
    ],
    ['cyber-threats', 'risk', 'risk = likelihood × impact\nA: 3 × 4 = 12\nB: 1 × 2 = 2'],
    [
      'cyber-response',
      'sequence',
      'isolate → report → preserve evidence → recover\n// practise only on your own test device',
    ],
    ['cyber-project', 'project', 'test account → MFA → permissions → backup → restore check'],
  ],
  ai: [
    ['ai-data', 'structure', 'id,x,label\n1,1,A\n2,2,A\n3,8,B\n4,9,B'],
    ['ai-split', 'model', 'train: 1,2,3\ntest: 4\n// no test examples in training'],
    [
      'ai-baseline',
      'compare',
      'labels: A,A,A,B\n// always predict A → 3/4\n// model accuracy must be compared with baseline',
    ],
    ['ai-evaluate', 'formula', 'actual: A,A,B,B\npredicted: A,B,B,B\naccuracy = 3 / 4 = 75%'],
    ['ai-bias', 'feedback', 'group A: 9/10 = 90%\ngroup B: 5/10 = 50%\noverall: 14/20 = 70%'],
    [
      'ai-prompts',
      'structure',
      '{"task":"summarise","context":"[synthetic text]","format":"3 bullet points","constraint":"use only supplied facts"}',
    ],
    [
      'ai-verification',
      'test',
      'claim → source → evidence → verified / unknown\n// fluent text ≠ proof',
    ],
    [
      'ai-privacy',
      'privacy',
      '{"name":"[REMOVED]","health_record":"[REMOVED]","example":"synthetic"}',
    ],
    ['ai-project', 'project', 'question → synthetic examples → baseline → test → limitations'],
  ],
  design: [
    [
      'design-research',
      'audience',
      'person → goal → obstacle\n// observe behaviour; ask open questions',
    ],
    ['design-flow', 'sequence', 'home → lesson → save → confirmation\n// also: offline → retry'],
    ['design-wireframe', 'structure', '[heading]\n[explanation]\n[primary action]\n[help]'],
    ['design-hierarchy', 'compare', 'H1 > H2 > body\nprimary action: 1\nspacing: 8,16,24'],
    ['design-access', 'test', 'contrast ≥ 4.5:1\nkeyboard: Tab → Enter\nzoom: 200%\nlabel + input'],
    ['design-prototype', 'sequence', 'screen A → tap → screen B → back → screen A'],
    [
      'design-usability',
      'feedback',
      'task: A → B\nparticipant 1: ✓\nparticipant 2: A → C → ?\n// observe; do not coach',
    ],
    [
      'design-iterate',
      'experiment',
      'A: 2/5 succeed\nB: 4/5 succeed\n// same task; changed label only',
    ],
    ['design-project', 'project', 'need → flow → sketch → prototype → test → revision'],
  ],
  marketing: [
    ['marketing-audience', 'audience', 'audience → problem → benefit → action'],
    [
      'marketing-value',
      'compare',
      'feature: 10\nbenefit: 10 → goal\n// benefit must be supported by evidence',
    ],
    ['marketing-channel', 'compare', 'A: cost 20 / 2 enquiries\nB: cost 30 / 6 enquiries'],
    ['marketing-copy', 'audience', 'problem → useful offer → evidence → one action'],
    ['marketing-calendar', 'sequence', 'Mon: A\nWed: B\nFri: C\n// owner + date + goal for each'],
    [
      'marketing-metrics',
      'formula',
      '100 visits → 5 enquiries\nconversion = 5 / 100 × 100 = 5%\ncost 20 / 5 enquiries = 4',
    ],
    [
      'marketing-test',
      'experiment',
      'A: 10/100 = 10%\nB: 15/100 = 15%\n// change one headline; same audience and period',
    ],
    [
      'marketing-consent',
      'privacy',
      'opt-in → explain use → unsubscribe\n// no bought contact lists',
    ],
    ['marketing-project', 'project', 'audience → message → channel → budget → measure → revise'],
  ],
  business: [
    ['business-customer', 'audience', 'person → problem → current workaround → willingness to pay'],
    ['business-offer', 'structure', 'customer + problem + offer + price + delivery'],
    [
      'business-costs',
      'formula',
      'price = 100\nvariable cost = 70\ncontribution = 30\nfixed costs = 300\nbreak-even = 300 / 30 = 10 units',
    ],
    [
      'business-cash',
      'formula',
      'opening cash 200 + receipts 100 − payments 150 = closing cash 150',
    ],
    [
      'business-validation',
      'experiment',
      'hypothesis → 5 conversations → small trial → evidence → decision',
    ],
    ['business-operations', 'sequence', 'order → confirm → prepare → check → deliver → follow up'],
    [
      'business-records',
      'structure',
      'date,type,amount,reference\n2026-01-01,in,100,R01\n2026-01-02,out,70,R02',
    ],
    [
      'business-risk',
      'risk',
      'supplier A: likelihood 3 × impact 4 = 12\nbackup supplier → reduce impact',
    ],
    ['business-project', 'project', 'problem → offer → costs → trial → cash plan → next decision'],
  ],
  writing: [
    ['writing-purpose', 'audience', 'reader → purpose → main point → next action'],
    ['writing-outline', 'structure', 'I. main point\nII. evidence\nIII. next action'],
    ['writing-paragraph', 'structure', 'topic → supporting detail → connection'],
    [
      'writing-clarity',
      'compare',
      'A: 42 words, 3 ideas\nB: 12 words, 1 idea\n// keep meaning; remove repetition',
    ],
    ['writing-evidence', 'test', 'claim → original source → date → supporting evidence'],
    [
      'writing-tone',
      'audience',
      'same facts + different reader → different tone\n// respectful; clear; specific',
    ],
    ['writing-edit', 'feedback', 'draft → meaning → structure → sentence → spelling'],
    ['writing-feedback', 'feedback', 'reader understands: A\nreader asks: B?\nrevision: clarify B'],
    [
      'writing-project',
      'project',
      'brief → outline → draft → source check → revision → final message',
    ],
  ],
  project: [
    ['project-scope', 'structure', 'outcome + acceptance criteria\nin: A,B\nout: C'],
    [
      'project-breakdown',
      'structure',
      'deliverable → task A → subtask A1,A2\n// one owner per task',
    ],
    [
      'project-dependencies',
      'sequence',
      'A(2 days) → B(3 days) → D(1 day)\nA → C(1 day) → D\n// longest chain: 6 days',
    ],
    ['project-estimates', 'formula', 'A: 2h\nB: 3h\nC: 1h\ntotal: 6h + contingency'],
    [
      'project-board',
      'structure',
      '[To do] → [In progress] → [Done]\n// task + owner + acceptance check',
    ],
    ['project-risks', 'risk', 'risk: A\nlikelihood: 3\nimpact: 4\nowner: B\nresponse: C'],
    ['project-updates', 'audience', 'completed → next → blocker → request + date'],
    ['project-retro', 'feedback', 'worked: A\nblocked: B\nnext change: C + owner + date'],
    [
      'project-capstone',
      'project',
      'scope → tasks → dependencies → board → risk review → delivery check',
    ],
  ],
  teaching: [
    [
      'teaching-goals',
      'structure',
      'By the end: learner can [observable action]\n// explain, calculate, demonstrate',
    ],
    [
      'teaching-baseline',
      'feedback',
      'before: example task → learner response → next teaching step',
    ],
    ['teaching-example', 'sequence', 'show → explain why → learner predicts → compare'],
    ['teaching-practice', 'sequence', 'guided attempt → hints → independent attempt'],
    ['teaching-feedback', 'feedback', 'specific observation → next improvement → retry'],
    [
      'teaching-check',
      'test',
      'goal: calculate 10 + 20\ncheck: learner calculates 15 + 25\n// new example; same skill',
    ],
    [
      'teaching-inclusive',
      'compare',
      'text + diagram + keyboard access\n// same goal; different ways to practise',
    ],
    [
      'teaching-plan',
      'sequence',
      '2 min: goal\n3 min: example\n7 min: practice\n3 min: check + feedback',
    ],
    [
      'teaching-project',
      'project',
      'goal → starting check → example → practice → feedback → reflection',
    ],
  ],
};

// Each row follows the exact course order above. Technical examples stay code, not UI copy.
const titles = {
  en: {
    web: 'Use semantic HTML|Build responsive layouts|Collect input with forms|Connect events to the DOM|Make a page accessible|Debug and test a feature|Build a personal website',
    data: 'Clean a small dataset|Choose useful summary measures|Calculate with spreadsheets|Sort and filter records|Choose an honest chart|Group data with SQL|Handle personal data carefully|Explain findings and limits|Create a small data report',
    cyber:
      'Spot a phishing link|Keep sensitive information private|Update devices safely|Understand a network journey|Choose minimum permissions|Test a backup and restore|Prioritise security risks|Respond to a suspected incident|Create a security checklist',
    ai: 'Organise labelled examples|Separate training and testing|Compare with a baseline|Measure prediction accuracy|Check errors across groups|Write a structured prompt|Verify generated claims|Keep private data out of prompts|Build a responsible AI experiment',
    design:
      'Research a user problem|Map the user journey|Sketch a wireframe|Create a visual hierarchy|Check accessible design|Connect a clickable prototype|Run a usability test|Improve one design decision|Present a tested design',
    marketing:
      'Define your audience|Explain a useful benefit|Choose a marketing channel|Write a clear call to action|Plan a content calendar|Measure conversion and cost|Test one message change|Respect consent and privacy|Create a small campaign plan',
    business:
      'Interview a potential customer|Define your offer|Calculate costs and break-even|Plan cash flow|Validate with a small trial|Map delivery operations|Keep simple business records|Prepare for business risks|Present a tested business idea',
    writing:
      'Define reader and purpose|Organise an outline|Build a clear paragraph|Make sentences easier to read|Support claims with evidence|Choose an appropriate tone|Edit in useful stages|Use reader feedback|Publish a polished message',
    project:
      'Set scope and acceptance criteria|Break down deliverables|Map task dependencies|Estimate time and capacity|Manage work on a task board|Plan risk responses|Write a useful status update|Run a retrospective|Plan and review a small project',
    teaching:
      'Write an observable learning goal|Check starting knowledge|Demonstrate a worked example|Design guided practice|Give actionable feedback|Check skill with a new example|Make practice inclusive|Plan a short learning session|Deliver and reflect on a mini lesson',
  },
  pcm: {
    web: 'Use HTML wey show meaning|Build layout wey fit any screen|Collect input with forms|Connect events to DOM|Make everybody fit use page|Find error and test feature|Build your personal website',
    data: 'Clean small dataset|Choose useful summary measures|Calculate with spreadsheet|Sort and filter records|Choose chart wey no mislead|Group data with SQL|Handle personal data well|Explain findings and limits|Create small data report',
    cyber:
      'Spot phishing link|Keep sensitive information private|Update device safely|Understand network journey|Choose only permission wey you need|Test backup and restore|Arrange security risks by importance|Respond to suspected incident|Create security checklist',
    ai: 'Arrange labelled examples|Separate training from testing|Compare with simple baseline|Measure prediction accuracy|Check errors for different groups|Write structured prompt|Verify claims wey AI generate|Keep private data out of prompts|Build responsible AI experiment',
    design:
      'Research user problem|Map user journey|Sketch wireframe|Arrange visual importance|Check accessible design|Connect clickable prototype|Run usability test|Improve one design decision|Present design wey you test',
    marketing:
      'Define your audience|Explain useful benefit|Choose marketing channel|Write clear action request|Plan content calendar|Measure conversion and cost|Test one message change|Respect consent and privacy|Create small campaign plan',
    business:
      'Interview possible customer|Define your offer|Calculate costs and break-even|Plan cash flow|Validate with small trial|Map delivery work|Keep simple business records|Prepare for business risks|Present business idea wey you test',
    writing:
      'Define reader and purpose|Arrange outline|Build clear paragraph|Make sentences easy to read|Support claims with evidence|Choose suitable tone|Edit in useful stages|Use reader feedback|Publish polished message',
    project:
      'Set scope and acceptance checks|Break deliverables into tasks|Map tasks wey depend on others|Estimate time and capacity|Manage work for task board|Plan risk response|Write useful status update|Review wetin work and wetin no work|Plan and review small project',
    teaching:
      'Write learning goal wey person fit show|Check wetin learner know before|Show worked example|Design guided practice|Give feedback wey learner fit use|Check skill with new example|Make practice fit everybody|Plan short learning session|Teach mini lesson and reflect',
  },
  fr: {
    web: 'Utiliser le HTML sémantique|Créer une mise en page adaptative|Recueillir des données avec un formulaire|Relier les événements au DOM|Rendre une page accessible|Déboguer et tester une fonctionnalité|Créer un site personnel',
    data: 'Nettoyer un petit jeu de données|Choisir des mesures de synthèse|Calculer avec un tableur|Trier et filtrer des observations|Choisir un graphique honnête|Regrouper des données avec SQL|Protéger les données personnelles|Expliquer les résultats et leurs limites|Créer un rapport de données',
    cyber:
      'Repérer un lien frauduleux|Préserver les informations sensibles|Mettre à jour un appareil en sécurité|Comprendre un trajet réseau|Accorder les permissions minimales|Tester une sauvegarde et sa restauration|Hiérarchiser les risques de sécurité|Réagir à un incident suspect|Créer une liste de sécurité',
    ai: 'Organiser des exemples étiquetés|Séparer entraînement et test|Comparer à une référence simple|Mesurer la précision des prédictions|Vérifier les erreurs par groupe|Rédiger une consigne structurée|Vérifier les affirmations générées|Écarter les données privées des consignes|Créer une expérience IA responsable',
    design:
      'Étudier un problème utilisateur|Tracer le parcours utilisateur|Dessiner une maquette simple|Créer une hiérarchie visuelle|Vérifier l’accessibilité|Relier un prototype interactif|Réaliser un test d’utilisation|Améliorer une décision de conception|Présenter une conception testée',
    marketing:
      'Définir son public|Expliquer un bénéfice utile|Choisir un canal de communication|Rédiger un appel à l’action clair|Planifier un calendrier de contenu|Mesurer conversion et coût|Tester un changement de message|Respecter consentement et vie privée|Créer un plan de campagne',
    business:
      'Interroger un client potentiel|Définir son offre|Calculer les coûts et le seuil de rentabilité|Planifier la trésorerie|Valider avec un petit essai|Décrire les étapes de livraison|Tenir des registres simples|Préparer les risques commerciaux|Présenter une idée testée',
    writing:
      'Définir le lecteur et le but|Organiser un plan|Construire un paragraphe clair|Simplifier les phrases|Appuyer les affirmations sur des preuves|Choisir un ton adapté|Réviser par étapes|Utiliser les retours du lecteur|Publier un message soigné',
    project:
      'Fixer le périmètre et les critères de réussite|Décomposer les livrables|Relier les dépendances des tâches|Estimer le temps et la capacité|Gérer un tableau de tâches|Préparer les réponses aux risques|Rédiger un suivi utile|Organiser une rétrospective|Planifier et évaluer un petit projet',
    teaching:
      'Écrire un objectif observable|Vérifier les connaissances initiales|Montrer un exemple résolu|Concevoir une pratique guidée|Donner un retour utile|Vérifier la compétence avec un nouvel exemple|Rendre la pratique inclusive|Planifier une courte séance|Enseigner et analyser une mini-leçon',
  },
  yo: {
    web: 'Lo HTML tó fi ìtumọ̀ hàn|Ṣẹ̀dá ìṣètò tó bá gbogbo ojú-ìwé mu|Gba ìdáhùn pẹ̀lú fọ́ọ̀mù|So ìṣẹ̀lẹ̀ pọ̀ mọ́ DOM|Jẹ́ kí gbogbo ènìyàn lè lo ojú-ìwé|Wá àṣìṣe kí o sì dán iṣẹ́ wò|Ṣẹ̀dá ojú-òpó ti ara rẹ',
    data: 'Ṣètò dátà kékeré|Yan ìwọ̀n àkótán tó wúlò|Ṣírò pẹ̀lú spreadsheet|Ṣètò àti yọ àkọsílẹ̀ dátà|Yan àwòrán dátà tí kò ṣi ènìyàn lọ́nà|Ṣe àkójọpọ̀ dátà pẹ̀lú SQL|Dáàbò bo dátà ẹni|Ṣàlàyé àbájáde àti ààlà rẹ|Ṣẹ̀dá ìròyìn dátà kékeré',
    cyber:
      'Mọ ìjápọ̀ ẹ̀tàn|Tọ́jú ìsọfúnni àṣírí|Ṣe àfikún tuntun sí ẹrọ láìléwu|Lóye ìrìnàjò nẹ́tíwọ́ọ̀kì|Yan àṣẹ tó kéré jù tó yẹ|Dán àfipamọ́ àti ìmúpadàbọ̀ wò|Ṣètò ewu ààbò nípa pàtàkì|Dáhùn sí ìṣẹ̀lẹ̀ tó ń fura|Ṣẹ̀dá àkójọ àyẹ̀wò ààbò',
    ai: 'Ṣètò àwọn àpẹẹrẹ tó ní àmì|Ya ẹ̀kọ́ sọ́tọ̀ kúrò ní àyẹ̀wò|Fi wé àpẹẹrẹ ìpilẹ̀|Wọn ìpéye àsọtẹ́lẹ̀|Ṣàyẹ̀wò àṣìṣe láàárín ẹgbẹ́|Kọ ìtọ́sọ́nà tó ní ìṣètò|Ṣàyẹ̀wò ohun tí AI sọ|Má fi dátà àṣírí sínú ìtọ́sọ́nà|Ṣẹ̀dá àdánwò AI tó ní ojúṣe',
    design:
      'Ṣèwádìí ìṣòro olùlò|Ya ìrìnàjò olùlò|Ya àpẹẹrẹ ojú-ìwé|Ṣètò ohun tí ojú máa kọ́kọ́ rí|Ṣàyẹ̀wò àpẹrẹ fún gbogbo ènìyàn|So àpẹẹrẹ ìbáṣepọ̀ pọ̀|Dán lílo ojú-ìwé wò|Ṣe ìpinnu àpẹrẹ kan dáadáa sí i|Fi àpẹrẹ tí a ti dán wò hàn',
    marketing:
      'Mọ àwọn tí o fẹ́ bá sọ̀rọ̀|Ṣàlàyé àǹfààní tó wúlò|Yan ọ̀nà ìpolówó|Kọ ìgbésẹ̀ tó ṣe kedere|Ṣètò kálẹ́ńdà àkóónú|Wọn àbájáde àti ìnáwó|Dán ìyípadà ìfiránṣẹ́ kan wò|Bọ̀wọ̀ fún ìyọ̀nda àti àṣírí|Ṣẹ̀dá ètò ìpolówó kékeré',
    business:
      'Bá oníbàárà tó ṣeéṣe sọ̀rọ̀|Ṣàlàyé ohun tí o ń pèsè|Ṣírò ìnáwó àti ìdọ́gba owó|Ṣètò bí owó ṣe ń wọlé àti jáde|Dán èrò wò pẹ̀lú àdánwò kékeré|Ṣètò ìgbésẹ̀ fífi iṣẹ́ dé|Tọ́jú àkọsílẹ̀ òwò kékeré|Múra fún ewu òwò|Fi èrò òwò tí a ti dán wò hàn',
    writing:
      'Mọ olùkà àti ète|Ṣètò àkótán ìkọ̀wé|Kọ ìpínrọ̀ tó ṣe kedere|Jẹ́ kí gbólóhùn rọrùn láti kà|Fi ẹ̀rí mú ohun tí o sọ lẹ́sẹ̀|Yan ọ̀nà ọ̀rọ̀ tó yẹ|Ṣàtúnṣe ní ìgbésẹ̀|Lo àbá olùkà|Ṣàgbéjáde ìfiránṣẹ́ tó dára',
    project:
      'Yan ààlà àti àmì àṣeyọrí|Pín àbájáde sí iṣẹ́ kéékèèké|Ṣètò ohun tí iṣẹ́ ń dúró de|Ṣírò àkókò àti agbára|Ṣàkóso iṣẹ́ lórí pátákó|Ṣètò ìdáhùn sí ewu|Kọ ìròyìn ìlọsíwájú tó wúlò|Ṣàyẹ̀wò ohun tó ṣiṣẹ́|Ṣètò àti ṣàyẹ̀wò iṣẹ́ àkànṣe kékeré',
    teaching:
      'Kọ ète ẹ̀kọ́ tí a lè rí|Ṣàyẹ̀wò ohun tí akẹ́kọ̀ọ́ mọ̀ tẹ́lẹ̀|Fi àpẹẹrẹ tí a ṣiṣẹ́ hàn|Ṣètò ìṣe pẹ̀lú ìtọ́sọ́nà|Fúnni ní àbá tí a lè lò|Ṣàyẹ̀wò ọgbọ́n pẹ̀lú àpẹẹrẹ tuntun|Jẹ́ kí ìṣe bá gbogbo ènìyàn mu|Ṣètò ẹ̀kọ́ kúkúrú|Kọ́ ẹ̀kọ́ kékeré kí o sì ronú lórí rẹ',
  },
  ha: {
    web: 'Yi amfani da HTML mai ma’ana|Gina tsari mai dacewa da allo|Karɓi bayanai da fom|Haɗa abubuwa da DOM|Sauƙaƙa shafi ga kowa|Gano kuskure ka gwada aiki|Gina shafinka na kai',
    data: 'Tsaftace ƙaramin bayanai|Zaɓi ma’aunin taƙaitawa|Yi lissafi da takardar lissafi|Jera ka tace bayanai|Zaɓi jadawalin da bai yaudara ba|Tara bayanai da SQL|Kare bayanan mutum|Bayyana sakamako da iyakoki|Ƙirƙiri rahoton bayanai',
    cyber:
      'Gane hanyar yaudara|Riƙe bayanan sirri|Sabunta na’ura cikin aminci|Fahimci tafiyar hanyar sadarwa|Zaɓi izini mafi ƙaranci|Gwada ajiyar bayanai da dawo da su|Jera haɗarin tsaro|Amsa abin da ake zargi|Ƙirƙiri jerin duba tsaro',
    ai: 'Tsara misalai masu alama|Raba horo da gwaji|Kwatanta da ma’aunin farko|Auna daidaiton hasashe|Duba kuskure tsakanin rukuni|Rubuta umarni mai tsari|Tabbatar da maganar AI|Kada a saka sirri a umarni|Gina gwajin AI mai alhaki',
    design:
      'Binciki matsalar mai amfani|Zana tafiyar mai amfani|Zana tsarin farko|Tsara muhimmancin abubuwan gani|Duba amfani ga kowa|Haɗa samfurin dannawa|Yi gwajin amfani|Inganta shawarar zane guda|Gabatar da zanen da aka gwada',
    marketing:
      'Bayyana masu sauraro|Bayyana amfani mai ma’ana|Zaɓi hanyar talla|Rubuta kiran aiki bayyananne|Tsara kalandar abun ciki|Auna sakamako da kuɗi|Gwada canjin saƙo guda|Mutunta yarda da sirri|Ƙirƙiri ƙaramin shirin talla',
    business:
      'Tambayi abokin ciniki mai yiwuwa|Bayyana tayinka|Lissafa kuɗi da matakin daidaito|Tsara shigar kuɗi da fita|Tabbatar da ƙaramin gwaji|Tsara matakan isarwa|Riƙe bayanan kasuwanci|Shirya haɗarin kasuwanci|Gabatar da ra’ayin da aka gwada',
    writing:
      'Bayyana mai karatu da manufa|Tsara jigon rubutu|Gina sakin layi bayyananne|Sauƙaƙa jimloli|Tallafa magana da hujja|Zaɓi salon magana mai dacewa|Gyara a matakai|Yi amfani da ra’ayin mai karatu|Wallafa saƙo mai kyau',
    project:
      'Saita iyaka da ma’aunin nasara|Rarraba sakamako zuwa ayyuka|Tsara dogaron ayyuka|Kimanta lokaci da ƙarfi|Sarrafa aikin a allo|Tsara amsar haɗari|Rubuta rahoton ci gaba|Yi bitar abin da ya faru|Tsara ka duba ƙaramin aiki',
    teaching:
      'Rubuta burin koyo da ake iya gani|Duba ilimin farko|Nuna misalin da aka warware|Tsara gwaji tare da jagora|Ba da shawarar da za a yi amfani da ita|Duba ƙwarewa da sabon misali|Sauƙaƙa gwaji ga kowa|Tsara gajeren zaman koyo|Koyar da ƙaramin darasi ka yi tunani',
  },
  ig: {
    web: 'Jiri HTML nwere ihe ọ pụtara|Mepụta nhazi dabara na ihuenyo|Nata ozi site na fọm|Jikọta ihe omume na DOM|Mee ka onye ọ bụla jiri ibe ahụ|Chọta njehie ma nwalee ọrụ|Mepụta weebụsaịtị nke gị',
    data: 'Hichaa obere data|Họrọ nha nchịkọta bara uru|Gbakọọ na spreadsheet|Hazie ma nyochaa ndekọ|Họrọ eserese na-eduhieghị|Jikọta data na SQL|Chebe ozi mmadụ|Kọwaa nchọpụta na oke ya|Mepụta obere akụkọ data',
    cyber:
      'Chọpụta njikọ aghụghọ|Debe ozi nzuzo|Melite ngwaọrụ n’enweghị nsogbu|Ghọta njem netwọk|Họrọ naanị ikike dị mkpa|Nwalee nchekwa na iweghachi data|Hazie ihe ize ndụ nche|Zaghachi ihe a na-enyo enyo|Mepụta ndepụta nyocha nche',
    ai: 'Hazie ihe atụ nwere akara|Kewaa ọzụzụ na ule|Tụnyere nha mbido|Tụọ izi ezi amụma|Lelee njehie n’otu dị iche|Dee ntụziaka nwere nhazi|Lelee ihe AI kwuru|E tinyela ozi nzuzo na ntụziaka|Mepụta nnwale AI nwere ọrụ',
    design:
      'Nyochaa nsogbu onye ọrụ|See njem onye ọrụ|See nhazi mbido|Hazie mkpa ihe a na-ahụ|Lelee atụmatụ onye ọ bụla ga-eji|Jikọta ihe atụ a na-pịa|Mee ule iji ya|Melite otu mkpebi atụmatụ|Gosi atụmatụ a nwalere',
    marketing:
      'Kọwaa ndị ị chọrọ iru|Kọwaa uru bara uru|Họrọ ụzọ mgbasa ozi|Dee oku omume doro anya|Hazie kalenda ọdịnaya|Tụọ nsonaazụ na ọnụ ahịa|Nwalee otu mgbanwe ozi|Kwanyere nkwenye na nzuzo ùgwù|Mepụta obere atụmatụ mgbasa ozi',
    business:
      'Jụọ onye ahịa nwere ike ịzụta|Kọwaa ihe ị na-enye|Gbakọọ ọnụ ahịa na ebe ego nhata|Hazie ego na-abata na-apụ|Lelee echiche na obere ule|Hazie ọrụ nnyefe|Debe obere ndekọ azụmahịa|Kwadebe maka ihe ize ndụ azụmahịa|Gosi echiche azụmahịa a nwalere',
    writing:
      'Kọwaa onye na-agụ na ebumnuche|Hazie atụmatụ edemede|Mepụta paragraf doro anya|Mee ka ahịrịokwu dị mfe|Jiri ihe akaebe kwado okwu|Họrọ ụdị okwu kwesịrị ekwesị|Dezie n’usoro|Jiri ndụmọdụ onye na-agụ|Bipụta ozi emeziri nke ọma',
    project:
      'Họrọ oke na ihe a ga-eji mara ihe ịga nke ọma|Kewaa ihe a ga-emepụta|Hazie ọrụ dabere na ibe ya|Tụọ oge na ikike|Jikwaa ọrụ na bọọdụ|Hazie azịza ihe ize ndụ|Dee akụkọ ọganihu bara uru|Lelee ihe mere|Hazie ma lelee obere ọrụ',
    teaching:
      'Dee ebumnuche a pụrụ ịhụ|Lelee ihe onye na-amụ maara|Gosi ihe atụ emechara|Hazie omume nwere nduzi|Nye ndụmọdụ a pụrụ iji|Lelee nka na ihe atụ ọhụrụ|Mee ka omume dabara na onye ọ bụla|Hazie obere oge ọmụmụ|Kụzie obere nkuzi ma tụgharịa uche',
  },
};

// Concept explanations are translated independently from code examples.
const explanations = {
  en: {
    structure:
      'A clear structure gives each part a specific role. Read the worked example from top to bottom and identify the input, the important fields and the result. Missing information should be made explicit, not silently invented. Consistent labels make the work easier to check and reuse.',
    sequence:
      'Some steps depend on earlier steps. Follow the arrows in the worked example and explain what must happen first and why. A sequence should also describe what happens when a step fails. Check each transition before moving on; completing the last step alone does not prove the whole process worked.',
    formula:
      'A calculation needs defined inputs, an operation and a meaningful unit. Work through the example by hand before using a tool. Check the denominator, missing values and whether the result is plausible. An accurate calculation still needs context before it supports a decision.',
    compare:
      'Compare options against a clear goal rather than choosing the most attractive one. The example shows alternatives or a constraint. Name the trade-off, keep the comparison fair and justify your choice with evidence. A solution that works in one situation may need adjustment in another.',
    test: 'A useful test states the input and the expected result before checking the actual result. Try the worked example, then include an empty, unexpected or boundary case. Record what happened and make a small correction. Repeat the test after the correction so you know the problem was addressed.',
    privacy:
      'Use invented information for this exercise. Collect only the information needed for a clear purpose, remove identifying details and limit who can see it. The example shows data that should be removed or permission that should be checked. Do not put real passwords, contact details or confidential records in your notes.',
    feedback:
      'Feedback is useful when it refers to an observation and suggests a specific next step. Inspect the example for evidence of what worked and what caused difficulty. Separate what you observed from what you assumed. Make one improvement and check whether it helps; a small sample does not represent everyone.',
    experiment:
      'An experiment begins with a testable question and a measure of success. The example changes one factor while keeping the rest comparable. Record a baseline, run a small trial and compare the result. Do not promise that one small result will hold for every audience or situation.',
    audience:
      'Begin with the person who needs the work and the action they want to take. The example connects a need, a useful response and a next step. Include enough context to make that step clear, use respectful language and avoid unsupported claims. Check the result with someone from the intended audience.',
    model:
      'Training examples help a model learn a pattern; separate test examples check whether it works beyond those examples. Keep the test set out of training and compare predictions with known answers. Errors and unfamiliar cases matter. Good performance on a small test does not guarantee reliable performance everywhere.',
    risk: 'A risk combines the chance of something happening with the harm it could cause. In the example, compare likelihood and impact, then choose a practical control. Prioritise larger risks and name who will act. A checklist reduces mistakes but cannot guarantee that every threat has disappeared.',
    project:
      'Bring the earlier skills together in a small project. Use the worked example as a starting outline, define a useful outcome and create something you can demonstrate. Test it against your goal, explain a limitation and record one improvement. Keep your draft and evidence so another learner can understand your decisions.',
  },
  pcm: {
    structure:
      'Clear structure give every part its own work. Read the example from top reach bottom; identify input, important fields and result. If information no dey, show am clearly instead of inventing am. Use labels wey remain the same so person fit check and use the work again.',
    sequence:
      'Some steps need another step to finish first. Follow the arrows for the example and explain wetin must happen first and why. Plan wetin go happen if one step fail. Check each change before you continue; finishing last step alone no mean say the whole process work.',
    formula:
      'Calculation need clear inputs, operation and unit. Work the example with hand before you use tool. Check wetin you divide by, missing values and whether result make sense. Correct calculation still need context before you use am make decision.',
    compare:
      'Compare options with clear goal instead of choosing only the fine one. The example show different options or limit. Explain wetin you gain and lose, compare fairly and use evidence support your choice. Wetin work for one situation fit need change for another.',
    test: 'Good test state input and expected result before you check actual result. Try the example, then test empty, unexpected or boundary case. Write wetin happen and make small correction. Repeat the test after correction so you know say you solve the problem.',
    privacy:
      'Use information wey you invent for this exercise. Collect only wetin you need for clear purpose, remove details wey identify person and limit who fit see am. The example show data to remove or permission to check. No put real password, contact details or secret records for notes.',
    feedback:
      'Useful feedback point to wetin person observe and give specific next step. Check the example for evidence of wetin work and wetin cause problem. Separate wetin you see from wetin you assume. Improve one thing and check if e help; small sample no represent everybody.',
    experiment:
      'Experiment start with question wey you fit test and way to measure success. For the example, change one thing and keep others similar. Record starting result, run small trial and compare. No promise say one small result go work for every audience or situation.',
    audience:
      'Start with person wey need the work and action wey dem want take. The example connect need, useful response and next step. Give enough context, use respectful words and no make claim without evidence. Check your work with person from the audience.',
    model:
      'Training examples help model learn pattern; separate test examples check if e work beyond those examples. No put test examples for training. Compare prediction with known answers. Errors and unfamiliar cases matter; small test no guarantee say model go work everywhere.',
    risk: 'Risk join chance say something go happen with harm wey e fit cause. Compare likelihood and impact for the example, then choose practical control. Handle bigger risks first and name who go act. Checklist reduce mistakes but e no guarantee say all threats don disappear.',
    project:
      'Join the skills wey you don learn for small project. Use example start your outline, define useful result and create something wey you fit show. Test am against your goal, explain one limit and write one improvement. Keep draft and evidence so another learner fit understand your decisions.',
  },
  fr: {
    structure:
      'Une structure claire donne un rôle à chaque partie. Lisez l’exemple de haut en bas et repérez les entrées, les champs importants et le résultat. Signalez les informations manquantes plutôt que de les inventer. Des libellés cohérents facilitent la vérification et la réutilisation.',
    sequence:
      'Certaines étapes dépendent des précédentes. Suivez les flèches de l’exemple et expliquez ce qui doit venir en premier et pourquoi. Prévoyez aussi le cas où une étape échoue. Vérifiez chaque transition : atteindre la dernière étape ne prouve pas que tout le processus a fonctionné.',
    formula:
      'Un calcul exige des entrées définies, une opération et une unité. Résolvez l’exemple à la main avant d’utiliser un outil. Vérifiez le dénominateur, les valeurs manquantes et la plausibilité du résultat. Un calcul exact demande encore du contexte avant de guider une décision.',
    compare:
      'Comparez les options selon un objectif clair. L’exemple présente des alternatives ou une contrainte. Expliquez le compromis, comparez équitablement et justifiez votre choix par des preuves. Une solution adaptée à un contexte peut nécessiter des changements dans un autre.',
    test: 'Un test utile définit l’entrée et le résultat attendu avant de vérifier le résultat réel. Essayez l’exemple puis un cas vide, inattendu ou limite. Notez le résultat et apportez une correction ciblée. Répétez le test après la correction pour vérifier que le problème est résolu.',
    privacy:
      'Utilisez des données inventées pour cet exercice. Ne recueillez que le nécessaire, supprimez les éléments identifiants et limitez l’accès. L’exemple montre des données à retirer ou des permissions à vérifier. N’inscrivez aucun vrai mot de passe, contact ou document confidentiel dans vos notes.',
    feedback:
      'Un retour utile repose sur une observation et propose une prochaine action précise. Cherchez dans l’exemple ce qui fonctionne et ce qui pose problème. Distinguez observation et supposition. Améliorez un élément et vérifiez son effet ; un petit échantillon ne représente pas tout le monde.',
    experiment:
      'Une expérience commence par une question vérifiable et une mesure de réussite. L’exemple modifie un facteur en gardant les autres comparables. Notez une référence, faites un petit essai et comparez. Un seul résultat ne permet pas de promettre le même effet dans toutes les situations.',
    audience:
      'Commencez par la personne concernée et l’action qu’elle souhaite accomplir. L’exemple relie un besoin, une réponse utile et une prochaine étape. Donnez le contexte nécessaire, restez respectueux et évitez les affirmations sans preuve. Vérifiez votre travail avec une personne du public visé.',
    model:
      'Les exemples d’entraînement permettent d’apprendre une régularité ; des exemples distincts servent au test. Ne mêlez pas les données de test à l’entraînement. Comparez les prédictions aux réponses connues et examinez les erreurs. Un petit test réussi ne garantit pas une fiabilité universelle.',
    risk: 'Le risque combine la probabilité d’un événement et son impact. Comparez ces deux dimensions dans l’exemple, puis choisissez une mesure pratique. Traitez les risques majeurs en premier et désignez un responsable. Une liste de contrôle réduit les erreurs sans garantir la disparition des menaces.',
    project:
      'Réunissez les compétences précédentes dans un petit projet. Utilisez l’exemple comme plan initial, définissez un résultat utile et créez une réalisation démontrable. Testez-la selon votre objectif, expliquez une limite et notez une amélioration. Gardez vos brouillons et preuves pour expliquer vos décisions.',
  },
  yo: {
    structure:
      'Ìṣètò tó ṣe kedere ń fún ẹ̀yà kọ̀ọ̀kan ní iṣẹ́. Ka àpẹẹrẹ láti òkè dé ìsàlẹ̀; mọ ohun tó wọlé, àlàyé pàtàkì àti àbájáde. Fi ìsọfúnni tí kò sí hàn, má ṣe dá a sílẹ̀ fúnra rẹ. Àmì tó dúró ṣinṣin ń jẹ́ kí àyẹ̀wò àti lílo lẹ́ẹ̀kan sí i rọrùn.',
    sequence:
      'Àwọn ìgbésẹ̀ kan ń dúró de àwọn tó ṣáájú. Tẹ̀lé ọfà inú àpẹẹrẹ kí o ṣàlàyé ohun tó gbọ́dọ̀ ṣẹlẹ̀ kọ́kọ́ àti ìdí rẹ. Ṣètò ohun tó máa ṣẹlẹ̀ tí ìgbésẹ̀ bá kùnà. Ṣàyẹ̀wò ìyípadà kọ̀ọ̀kan; dé ìparí nìkan kò fi hàn pé gbogbo iṣẹ́ lọ dáadáa.',
    formula:
      'Ìṣirò nílò iye tó ṣe kedere, iṣẹ́ ìṣirò àti ẹyọ ìwọ̀n. Ṣe àpẹẹrẹ pẹ̀lú ọwọ́ kí o tó lo irinṣẹ́. Ṣàyẹ̀wò iye tí o ń pín sí, iye tí kò sí àti bóyá àbájáde bójú mu. Ìṣirò tó péye ṣì nílò àlàyé kí ó tó ṣèrànwọ́ fún ìpinnu.',
    compare:
      'Fi àwọn ọ̀nà wé ara wọn nípa ète tó ṣe kedere. Àpẹẹrẹ fi ọ̀nà tàbí ààlà hàn. Ṣàlàyé ohun tí o jèrè àti ohun tí o pàdánù, fi wé ara wọn lọ́nà tó tọ́, kí o sì lo ẹ̀rí. Ọ̀nà tó ṣiṣẹ́ ní ibi kan lè nílò ìyípadà ní ibi mìíràn.',
    test: 'Àyẹ̀wò tó wúlò sọ ohun tó wọlé àti àbájáde tí a retí kí a tó wo ohun tó ṣẹlẹ̀. Gbìyànjú àpẹẹrẹ, lẹ́yìn náà lo iye òfo tàbí àìròtẹ́lẹ̀. Kọ ohun tó ṣẹlẹ̀ kí o sì ṣe àtúnṣe kékeré. Tún àyẹ̀wò ṣe lẹ́yìn àtúnṣe láti mọ̀ pé a ti yanjú ìṣòro.',
    privacy:
      'Lo ìsọfúnni tí a dá sílẹ̀ fún ìṣe yìí. Gba ohun tó yẹ nìkan, yọ ohun tó lè fi ẹni hàn, kí o sì dín ẹni tó lè rí i kù. Àpẹẹrẹ fi ohun tó yẹ kí a yọ tàbí àṣẹ tó yẹ kí a ṣàyẹ̀wò hàn. Má kọ aṣínà gidi, àlàyé olubasọrọ tàbí àkọsílẹ̀ àṣírí sínú àkọsílẹ̀ rẹ.',
    feedback:
      'Àbá tó wúlò tọ́ka sí ohun tí a rí àti ìgbésẹ̀ tó kàn. Wo ẹ̀rí ohun tó ṣiṣẹ́ àti ibi tí ìṣòro wà nínú àpẹẹrẹ. Ya ohun tí o rí sọ́tọ̀ kúrò ní ohun tí o rò. Ṣe ohun kan dáadáa sí i kí o sì ṣàyẹ̀wò; àpẹẹrẹ kékeré kò dúró fún gbogbo ènìyàn.',
    experiment:
      'Àdánwò bẹ̀rẹ̀ pẹ̀lú ìbéèrè tí a lè ṣàyẹ̀wò àti ìwọ̀n àṣeyọrí. Àpẹẹrẹ yí ohun kan padà nígbà tí àwọn yòókù dúró bákan náà. Kọ àbájáde ìbẹ̀rẹ̀, ṣe àdánwò kékeré kí o sì fi wé e. Má ṣe ìlérí pé àbájáde kan máa ṣiṣẹ́ fún gbogbo ènìyàn.',
    audience:
      'Bẹ̀rẹ̀ pẹ̀lú ẹni tó nílò iṣẹ́ àti ohun tí ó fẹ́ ṣe. Àpẹẹrẹ so ìnílò, ìdáhùn tó wúlò àti ìgbésẹ̀ tó kàn pọ̀. Fúnni ní àlàyé tó tó, lo ọ̀rọ̀ ìbọ̀wọ̀, má sì sọ ohun tí kò ní ẹ̀rí. Ṣàyẹ̀wò iṣẹ́ rẹ pẹ̀lú ẹni tí ó jẹ́ fún.',
    model:
      'Àpẹẹrẹ ẹ̀kọ́ ń ran model lọ́wọ́ láti kọ́; àpẹẹrẹ àyẹ̀wò tó yàtọ̀ ń fi iṣẹ́ rẹ hàn. Má fi dátà àyẹ̀wò sínú ẹ̀kọ́. Fi àsọtẹ́lẹ̀ wé ìdáhùn tí a mọ̀, kí o sì wo àṣìṣe. Àṣeyọrí àyẹ̀wò kékeré kò túmọ̀ sí pé yóò ṣiṣẹ́ dáadáa ní gbogbo ibi.',
    risk: 'Ewu so bí ohun ṣe lè ṣẹlẹ̀ pọ̀ mọ́ ìpalára tí ó lè mú. Fi ìṣeeṣe àti ìpalára wé ara wọn nínú àpẹẹrẹ, kí o sì yan ìdáàbòbò tó ṣeé ṣe. Bẹ̀rẹ̀ pẹ̀lú ewu tó tóbi, yan ẹni tó máa ṣe iṣẹ́. Àkójọ àyẹ̀wò ń dín àṣìṣe kù ṣùgbọ́n kò mú gbogbo ewu kúrò.',
    project:
      'So ọgbọ́n tí o ti kọ́ pọ̀ sínú iṣẹ́ kékeré. Lo àpẹẹrẹ gẹ́gẹ́ bí àkótán, yan àbájáde tó wúlò, kí o sì ṣẹ̀dá ohun tí o lè fi hàn. Dán an wò nípa ète rẹ, ṣàlàyé ààlà kan àti àtúnṣe kan. Tọ́jú àkọsílẹ̀ àti ẹ̀rí kí akẹ́kọ̀ọ́ mìíràn lè lóye ìpinnu rẹ.',
  },
  ha: {
    structure:
      'Tsari bayyananne yana ba kowane sashi aikinsa. Karanta misalin daga sama zuwa ƙasa ka gano abin shiga, muhimman filaye da sakamako. Nuna bayanin da babu shi maimakon ƙirƙirarsa. Alamomi masu daidaito suna sauƙaƙa dubawa da sake amfani da aikin.',
    sequence:
      'Wasu matakai suna dogara da na baya. Bi kibiyoyin misalin ka bayyana abin da zai fara da dalilinsa. Shirya abin da za a yi idan mataki ya kasa. Duba kowane sauyi kafin ci gaba; kaiwa ƙarshe kaɗai ba ya nuna cewa duk aikin ya yi nasara.',
    formula:
      'Lissafi yana buƙatar bayanan shiga, aikin lissafi da ma’auni. Yi misalin da hannu kafin amfani da kayan aiki. Duba abin da ake rabawa da shi, bayanan da babu su da ko sakamakon ya yi ma’ana. Daidaiton lissafi yana buƙatar mahalli kafin yanke shawara.',
    compare:
      'Kwatanta zaɓuɓɓuka bisa buri bayyananne, ba kyawunsu kawai ba. Misalin yana nuna zaɓuɓɓuka ko iyaka. Bayyana abin da ake samu da abin da ake rasa; yi kwatanci na adalci da hujja. Abin da ya yi aiki a wuri ɗaya na iya buƙatar gyara a wani.',
    test: 'Gwaji mai amfani yana bayyana abin shiga da sakamakon da ake tsammani kafin dubawa. Gwada misalin, sannan gwada babu bayanai ko abin da ba a zata ba. Rubuta abin da ya faru ka yi ƙaramin gyara. Sake gwadawa bayan gyara don tabbatar da warware matsalar.',
    privacy:
      'Yi amfani da bayanan ƙirƙira a wannan aiki. Karɓi abin da ake buƙata kawai, cire abin da zai gano mutum kuma rage masu iya gani. Misalin yana nuna bayanan da za a cire ko izinin da za a duba. Kada ka rubuta kalmar sirri ta gaskiya, bayanan tuntuɓa ko takardun sirri.',
    feedback:
      'Shawara mai amfani tana danganta da abin da aka gani kuma ta nuna mataki na gaba. Duba misalin don hujjar nasara da wahala. Raba abin da ka gani da abin da ka zato. Inganta abu guda ka duba tasirinsa; ƙaramin samfur ba ya wakiltar kowa.',
    experiment:
      'Gwaji yana farawa da tambayar da za a bincika da ma’aunin nasara. Misalin yana canza abu guda tare da barin sauran iri ɗaya. Rubuta sakamakon farko, yi ƙaramin gwaji ka kwatanta. Sakamako guda ba ya tabbatar da nasara ga kowane rukuni ko yanayi.',
    audience:
      'Fara da mutumin da yake buƙatar aikin da abin da yake son yi. Misalin yana haɗa buƙata, amsa mai amfani da mataki na gaba. Ba da isasshen bayani, yi magana cikin mutunci kuma ka guji magana ba tare da hujja ba. Duba aikin tare da mutumin da aka yi masa.',
    model:
      'Misalan horo suna taimaka wa samfurin koyo; misalan gwaji daban suna duba aikinsa. Kada a saka bayanan gwaji cikin horo. Kwatanta hasashe da amsoshin da aka sani ka duba kurakurai. Nasara a ƙaramin gwaji ba ta tabbatar da inganci a ko’ina ba.',
    risk: 'Haɗari yana haɗa yiwuwar faruwar abu da illarsa. Kwatanta yiwuwa da tasiri a misalin sannan zaɓi matakin kariya. Fara da manyan haɗari ka bayyana mai ɗaukar mataki. Jerin dubawa yana rage kuskure amma ba ya kawar da duk barazana.',
    project:
      'Haɗa ƙwarewar da ka koya a ƙaramin aiki. Yi amfani da misalin a matsayin tsari, saita buri mai amfani ka ƙirƙiri abin da za ka nuna. Gwada shi da burinka, bayyana iyaka guda da gyara guda. Riƙe rubutunka da hujja don wani ɗalibi ya fahimci shawararka.',
  },
  ig: {
    structure:
      'Nhazi doro anya na-enye akụkụ ọ bụla ọrụ ya. Gụọ ihe atụ site n’elu ruo n’ala ma chọpụta ihe a na-etinye, ozi dị mkpa na nsonaazụ. Gosi ozi na-adịghị kama ịmepụta ya. Akara na-agbanweghị na-eme ka nyocha na iji ọrụ ọzọ dị mfe.',
    sequence:
      'Ụfọdụ usoro na-eche usoro mbụ. Soro akụ ndị dị n’ihe atụ ma kọwaa ihe ga-ebu ụzọ na ihe kpatara ya. Hazie ihe a ga-eme ma ọ bụrụ na otu usoro ada. Lelee mgbanwe ọ bụla tupu ịga n’ihu; iru njedebe naanị anaghị egosi na ọrụ niile gara nke ọma.',
    formula:
      'Ngụkọta chọrọ ihe a na-etinye, usoro ngụkọta na nha. Jiri aka rụọ ihe atụ tupu iji ngwaọrụ. Lelee ihe a na-ekewa, data na-adịghị na ma nsonaazụ ọ bụ ihe ezi uche. Ngụkọta ziri ezi ka chọrọ nkọwa tupu e jiri ya mee mkpebi.',
    compare:
      'Tụnyere nhọrọ site na ebumnuche doro anya kama ịma mma naanị. Ihe atụ na-egosi nhọrọ ma ọ bụ oke. Kọwaa uru na ọghọm, tụnyere n’ezi omume ma jiri ihe akaebe. Ihe na-arụ ọrụ n’otu ọnọdụ nwere ike ịchọ mgbanwe n’ọnọdụ ọzọ.',
    test: 'Ule bara uru na-akọwa ihe a na-etinye na nsonaazụ a tụrụ anya tupu a lelee nke mere. Nwaa ihe atụ, mgbe ahụ nwaa ihe efu ma ọ bụ ihe a na-atụghị anya. Dee ihe mere ma mee obere mmezi. Nwalee ọzọ mgbe mmezi gasịrị iji mara na edoziwo nsogbu ahụ.',
    privacy:
      'Jiri ozi emepụtara maka omume a. Nata naanị ihe dị mkpa, wepụ ihe na-egosi onye ma belata ndị ga-ahụ ya. Ihe atụ na-egosi ozi a ga-ewepụ ma ọ bụ ikike a ga-elele. E deela paswọọdụ n’ezie, ozi kọntaktị ma ọ bụ ndekọ nzuzo na ndetu gị.',
    feedback:
      'Ndụmọdụ bara uru na-ekwu ihe a hụrụ ma nye usoro ọzọ. Lelee ihe atụ maka ihe akaebe nke ihe rụrụ ọrụ na ihe siri ike. Kewaa ihe ị hụrụ na ihe ị chere. Melite otu ihe ma lelee ma ọ na-enyere aka; obere otu anaghị anọchi anya onye ọ bụla.',
    experiment:
      'Nnwale na-amalite na ajụjụ a pụrụ ịlele na nha ihe ịga nke ọma. Ihe atụ na-agbanwe otu ihe ma debe ndị ọzọ otu. Dee nsonaazụ mbido, mee obere ule ma tụnyere. Otu nsonaazụ anaghị ekwe nkwa otu ihe n’ọnọdụ ma ọ bụ otu ọ bụla.',
    audience:
      'Malite na onye chọrọ ọrụ ahụ na ihe ọ chọrọ ime. Ihe atụ jikọtara mkpa, azịza bara uru na usoro ọzọ. Nye nkọwa zuru oke, jiri okwu nkwanye ùgwù ma zere okwu enweghị ihe akaebe. Lelee ọrụ ahụ na onye n’otu ị chọrọ iru.',
    model:
      'Ihe atụ ọzụzụ na-enyere ụdị igwe ịmụ; ihe atụ ule dị iche na-enyocha ọrụ ya. E tinyela data ule na ọzụzụ. Tụnyere amụma na azịza a maara ma lelee njehie. Ihe ịga nke ọma na obere ule anaghị egosi na ọ ga-arụ ọrụ nke ọma ebe niile.',
    risk: 'Ihe ize ndụ jikọtara ohere ihe ga-eme na nsogbu ọ ga-ebute. Tụnyere ohere na mmetụta n’ihe atụ ma họrọ ụzọ nche. Bido na nnukwu ihe ize ndụ ma họrọ onye ga-eme ihe. Ndepụta nyocha na-ebelata njehie ma ọ naghị ewepụ egwu niile.',
    project:
      'Jikọta nka ị mụtara na obere ọrụ. Jiri ihe atụ malite nhazi, họrọ nsonaazụ bara uru ma mepụta ihe ị pụrụ igosi. Nwalee ya site na ebumnuche gị, kọwaa otu oke na otu mmezi. Debe ndetu na ihe akaebe ka onye na-amụ ọzọ ghọta mkpebi gị.',
  },
};
const instructions = {
  en: [
    'Study the example, then create your own version of “{topic}”. Change one input or decision, describe the result, and explain why your approach meets the goal.',
    'An example should be checked against its goal before we rely on the result.',
    'An example guarantees the same result in every situation without further checks.',
  ],
  pcm: [
    'Study the example, then create your own version of “{topic}”. Change one input or decision, describe result and explain why your approach meet the goal.',
    'We suppose check example against its goal before we rely on result.',
    'Example guarantee same result for every situation without any other check.',
  ],
  fr: [
    'Étudiez l’exemple puis créez votre version de « {topic} ». Modifiez une entrée ou une décision, décrivez le résultat et expliquez comment votre approche répond au but.',
    'Un exemple doit être vérifié selon son objectif avant de se fier au résultat.',
    'Un exemple garantit le même résultat dans toute situation sans autre vérification.',
  ],
  yo: [
    'Kẹ́kọ̀ọ́ àpẹẹrẹ, kí o sì ṣẹ̀dá ti ara rẹ fún “{topic}”. Yí ohun kan tàbí ìpinnu kan padà, ṣàlàyé àbájáde àti bí ọ̀nà rẹ ṣe bá ète mu.',
    'A gbọ́dọ̀ ṣàyẹ̀wò àpẹẹrẹ nípa ète rẹ kí a tó gbẹ́kẹ̀ lé àbájáde.',
    'Àpẹẹrẹ mú àbájáde kan náà wá ní gbogbo ibi láìsí àyẹ̀wò mìíràn.',
  ],
  ha: [
    'Yi nazarin misalin sannan ƙirƙiri naka na “{topic}”. Canza bayanin shiga ko shawara guda, bayyana sakamako da yadda tsarinka ya cika buri.',
    'Ya kamata a duba misali bisa burinsa kafin dogara da sakamakon.',
    'Misali yana tabbatar da sakamako ɗaya a kowane yanayi ba tare da ƙarin dubawa ba.',
  ],
  ig: [
    'Mụọ ihe atụ ahụ, mepụta nke gị maka “{topic}”. Gbanwee otu ihe ma ọ bụ mkpebi, kọwaa nsonaazụ na ihe kpatara usoro gị ji mezuo ebumnuche.',
    'A ga-enyocha ihe atụ site na ebumnuche ya tupu ịdabere na nsonaazụ.',
    'Ihe atụ na-ekwe nkwa otu nsonaazụ n’ọnọdụ niile n’enweghị nyocha ọzọ.',
  ],
};
const starters = { web: ['html', 'css', 'javascript'] };
for (const [locale, topicRows] of Object.entries(titles)) {
  const file = `public/lessons/${locale}.json`;
  const previous = JSON.parse(readFileSync(file, 'utf8'));
  const lessons = Object.fromEntries(
    ['html', 'css', 'javascript', ...Object.keys(courses).filter((p) => p !== 'web')].map((id) => [
      id,
      previous[id],
    ]),
  );
  for (const [path, rows] of Object.entries(courses)) {
    const names = topicRows[path].split('|');
    const notes = courseNotes[locale][path].split('|');
    if (names.length !== rows.length || notes.length !== rows.length)
      throw new Error(`Missing content: ${locale}/${path}`);
    rows.forEach(([id, concept, code], index) => {
      lessons[id] = {
        title: names[index],
        body: notes[index] + '\n\n' + explanations[locale][concept],
        practice: instructions[locale][0].replace('{topic}', names[index]),
        statement: index % 2 ? falseChecks[locale][concept] : notes[index],
        answer: index % 2 === 0,
        code,
      };
    });
  }
  writeFileSync(file, JSON.stringify(lessons, null, 2) + '\n');
}
const outline = Object.fromEntries(
  Object.entries(courses).map(([path, rows]) => [
    path,
    [...(starters[path] ?? [path]), ...rows.map((row) => row[0])],
  ]),
);
writeFileSync(
  'src/lib/course-outline.ts',
  `// Generated by scripts/expand-learning-content.mjs; IDs preserve saved progress.\nexport const courseOutline = ${JSON.stringify(outline, null, 2)};\n`,
);
const english = JSON.parse(readFileSync('public/lessons/en.json', 'utf8'));
const additions = Object.entries(courses).flatMap(([path, rows]) =>
  rows.map(([id]) => `('${path}/${id}',${english[id].answer})`),
);
writeFileSync(
  'supabase/migrations/20261011000100_ten_lessons.sql',
  `-- Expand the verified public lesson catalog without changing historical activity.\ninsert into public.lesson_catalog (lesson,answer) values\n${additions.join(',\n')}\non conflict (lesson) do update set answer=excluded.answer;\n`,
);
