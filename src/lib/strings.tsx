// Every user-facing label, in both languages the UIS timetable page comes in.
// The UI follows the language of the imported timetable rather than the
// browser: the course names and rooms on the grid are in that language anyway.

export const STRINGS = {
  cs: {
    kind: { lecture: 'přednáška', seminar: 'cvičení' },
    week: { odd: 'lichý týden', even: 'sudý týden' },
    weekShort: { odd: 'lichý', even: 'sudý' },
    validity: 'Platnost',
    lastChange: 'Poslední změna',
    lessons: (shown: number, total: number) => `${shown} ze ${total} hodin`,
    choicesPicked: (done: number, total: number) => `vybráno ${done} z ${total} voleb`,
    showPicked: 'Zobrazit jen vybrané',
    showingPicked: 'Zobrazeny jen vybrané',
    clearPicks: 'zrušit výběr',
    hint: (
      <>
        Kliknutím na hodinu v&nbsp;rozvrhu ji vyberete — dostane červený rám a&nbsp;ostatní varianty
        téže volby z&nbsp;rozvrhu zmizí. Vybrané hodiny a&nbsp;hodiny bez alternativy se nikdy
        neskrývají. <b>Zobrazit jen vybrané</b> navíc skryje varianty, které jste zatím nerozhodli;
        kliknutí na název předmětu skryje jen jeho nerozhodnuté varianty.
      </>
    ),
    picked: 'vybráno',
    notPicked: 'nevybráno',
    lectureOnly: 'není z čeho vybírat',
    variantsToPick: (n: number) => `${n} variant na výběr`,
    unpickHint: 'Kliknutím zrušíte výběr',
    hideCourse: 'Skrýt nerozhodnuté varianty tohoto předmětu',
    nothingToPick: 'Tento předmět nemá co vybírat',
    legendLecture: 'pevná — pokud předmět nemá víc variant',
    legendSeminar: 'varianta — klikněte pro výběr',
    legendWeek: 'probíhá každý druhý týden',
    legendPicked: 'červený rám = váš výběr',
    notesTitle: 'Poznámky',
    clickPick: 'Kliknutím vyberete',
    clickUnpick: 'Kliknutím zrušíte výběr',
    lectureFixed: 'Bez alternativy — vždy zobrazeno',
    weeksOnly: (w: string) => `pouze ${w}`,
    theme: { system: 'Podle systému', light: 'Světlý režim', dark: 'Tmavý režim' },
    themeHint: 'Přepnout světlý/tmavý režim',
    replace: 'Nahradit rozvrh',
    forget: 'Smazat data',
    forgetConfirm: 'Opravdu smazat uložený rozvrh z tohoto prohlížeče?',
    importTitle: 'Načtěte svůj rozvrh',
    privacy:
      'Rozvrh se zpracuje přímo ve vašem prohlížeči a uloží se jen do něj (localStorage). Nikam se neodesílá a nikam se neukládá na server.',
    steps: 'Postup',
    step1: 'V UIS otevřete Zobrazení a tisk rozvrhů (formát HTML).',
    step2: 'Otevřete konzoli prohlížeče (⌥⌘J / F12) a spusťte:',
    copy: 'Kopírovat příkaz',
    copied: 'Zkopírováno',
    copyLink: 'Kopírovat odkaz',
    onPhone: 'Import přímo v telefonu',
    onPhoneHelp:
      'V telefonu není konzole. Uložte si tento řádek jako záložku — vytvořte libovolnou záložku, upravte ji a vložte tenhle text místo adresy (do adresního řádku ho vkládat nejde, prohlížeč „javascript:“ smaže). Na stránce rozvrhu pak záložku spusťte: stránka se zabalí a rovnou otevře tuhle aplikaci s načteným rozvrhem. Nic se nekopíruje ani neodesílá.',
    toPhone: 'Přenést do telefonu',
    shareTitle: 'Otevřít v telefonu',
    shareHelp:
      'Naskenujte kód telefonem, nebo si odkaz pošlete. Rozvrh je zabalený přímo v odkazu — nikam se neodesílá.',
    shareTooBig: 'Rozvrh je na QR kód moc velký, použijte odkaz.',
    shareError: 'Odkaz se nepodařilo vytvořit.',
    close: 'Zavřít',
    step3: 'Vložte zkopírovaný obsah níže, nebo sem přetáhněte uloženou stránku (.html).',
    paste: 'Sem vložte HTML stránky rozvrhu…',
    load: 'Načíst rozvrh',
    dropHere: 'Pusťte soubor .html',
    errNoTimetable: 'V vloženém obsahu není rozvrhová tabulka. Zkopírovali jste celou stránku rozvrhu?',
    errEmpty: 'Nejdřív vložte obsah stránky.',
    errGeneric: 'Obsah se nepodařilo zpracovat.',
    loaded: (n: number) => `Načteno ${n} hodin.`,
    versionsLabel: 'Verze',
    noVersions: 'Zatím žádné verze',
    versionName: (n: number) => `Verze ${n}`,
    newVersion: 'Nová verze',
    saveVersion: 'Uložit verzi',
    saveChanges: 'Uložit',
    saveAsNew: 'Uložit jako novou',
    discardChanges: 'Zahodit změny',
    unsavedChanges: 'neuložené změny',
    saveIncomplete: (left: number) => `Nejdřív dokončete výběr — zbývá ${left}`,
    namePrompt: 'Název verze',
    renameVersion: 'Přejmenovat verzi',
    deleteVersion: 'Smazat verzi',
    deleteVersionConfirm: (name: string) => `Smazat verzi „${name}“ z tohoto prohlížeče?`,
    switchVersion: 'Přepnout na tuto verzi',
    dirtyConfirm: 'Máte neuložené změny. Opustit je?',
    versionsHint:
      'Až budete mít celý týden vybraný, uložte ho jako verzi. Nová verze začíná s prázdným výběrem — kliknutím na uloženou verzi ji kdykoli vrátíte do rozvrhu.',
  },
  en: {
    kind: { lecture: 'lecture', seminar: 'seminar' },
    week: { odd: 'odd week', even: 'even week' },
    weekShort: { odd: 'odd', even: 'even' },
    validity: 'Validity',
    lastChange: 'Last change',
    lessons: (shown: number, total: number) => `${shown} of ${total} lessons`,
    choicesPicked: (done: number, total: number) => `${done} of ${total} choices picked`,
    showPicked: 'Show picked only',
    showingPicked: 'Showing picked only',
    clearPicks: 'clear picks',
    hint: (
      <>
        Click any lesson in the grid to pick it — it gets a red outline and the other variants of the
        same choice drop off the grid. Picks and lessons without alternatives are never filtered out.{' '}
        <b>Show picked only</b> additionally hides the variants you have not decided yet; clicking a
        course name hides that one course&rsquo;s undecided variants.
      </>
    ),
    picked: 'picked',
    notPicked: 'not picked',
    lectureOnly: 'nothing to choose',
    variantsToPick: (n: number) => `${n} variants to choose from`,
    unpickHint: 'Click to unpick',
    hideCourse: 'Hide this course’s undecided variants',
    nothingToPick: 'Nothing to choose for this course',
    legendLecture: 'fixed — unless the course offers several',
    legendSeminar: 'variant — click to pick',
    legendWeek: 'run every other week',
    legendPicked: 'red outline = picked by you',
    notesTitle: 'Notes',
    clickPick: 'Click to pick',
    clickUnpick: 'Click to unpick',
    lectureFixed: 'No alternatives — always shown',
    weeksOnly: (w: string) => `${w} only`,
    theme: { system: 'System theme', light: 'Light mode', dark: 'Dark mode' },
    themeHint: 'Switch light/dark mode',
    replace: 'Replace timetable',
    forget: 'Delete data',
    forgetConfirm: 'Delete the stored timetable from this browser?',
    importTitle: 'Load your timetable',
    privacy:
      'The timetable is parsed in your browser and stored only there (localStorage). Nothing is uploaded and nothing is kept on a server.',
    steps: 'Steps',
    step1: 'In UIS open Display and print the course weekly plan (HTML format).',
    step2: 'Open the browser console (⌥⌘J / F12) and run:',
    copy: 'Copy command',
    copied: 'Copied',
    copyLink: 'Copy link',
    onPhone: 'Import on the phone itself',
    onPhoneHelp:
      'Phones have no console. Save this line as a bookmark — create any bookmark, edit it and paste this in place of the address (pasting it into the address bar will not work, browsers strip “javascript:”). On the timetable page run that bookmark: the page is packed up and opens this app with the timetable already loaded. Nothing is copied or uploaded.',
    toPhone: 'Send to phone',
    shareTitle: 'Open on your phone',
    shareHelp:
      'Scan the code with your phone, or send yourself the link. The timetable is packed into the link itself — it is not uploaded anywhere.',
    shareTooBig: 'This timetable is too large for a QR code, use the link.',
    shareError: 'Could not build the link.',
    close: 'Close',
    step3: 'Paste what you copied below, or drop the saved page (.html) here.',
    paste: 'Paste the timetable page HTML here…',
    load: 'Load timetable',
    dropHere: 'Drop the .html file',
    errNoTimetable: 'No timetable table in the pasted content. Did you copy the whole timetable page?',
    errEmpty: 'Paste the page content first.',
    errGeneric: 'Could not parse the content.',
    loaded: (n: number) => `Loaded ${n} lessons.`,
    versionsLabel: 'Versions',
    noVersions: 'No versions yet',
    versionName: (n: number) => `Version ${n}`,
    newVersion: 'New version',
    saveVersion: 'Save version',
    saveChanges: 'Save',
    saveAsNew: 'Save as new',
    discardChanges: 'Discard changes',
    unsavedChanges: 'unsaved changes',
    saveIncomplete: (left: number) => `Finish picking first — ${left} to go`,
    namePrompt: 'Version name',
    renameVersion: 'Rename version',
    deleteVersion: 'Delete version',
    deleteVersionConfirm: (name: string) => `Delete version “${name}” from this browser?`,
    switchVersion: 'Switch to this version',
    dirtyConfirm: 'You have unsaved changes. Leave them?',
    versionsHint:
      'Once the whole week is picked, save it as a version. New version starts from an empty grid — click a saved version any time to bring it back.',
  },
}

export type Strings = (typeof STRINGS)['cs']

/** Fallback until a timetable is imported and names its own language. */
export const browserLang = (): 'cs' | 'en' =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
