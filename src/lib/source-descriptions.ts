export interface SourceDescription {
  settingsBlurb: string
  goodFor: string
  notFor: string
  howItWorks: string
}

export const SOURCE_DESCRIPTIONS: Record<string, SourceDescription> = {
  'merriam-webster': {
    settingsBlurb: 'Gold-standard American English dictionary.',
    goodFor: 'Everyday words, part-of-speech tags, authoritative definitions.',
    notFor: 'Proper nouns, slang, brand-new coinages.',
    howItWorks:
      'Clear, editor-vetted definitions from the publisher of the Collegiate Dictionary. Usually the cleanest short definition available.',
  },
  dictionary: {
    settingsBlurb: 'Free dictionary backed by Wiktionary.',
    goodFor: 'Common English words when Merriam-Webster is unavailable.',
    notFor: 'Technical jargon, proper nouns, slang.',
    howItWorks:
      'Wiktionary-sourced definitions via dictionaryapi.dev. Coverage is decent for everyday vocabulary, thinner for niche terms.',
  },
  datamuse: {
    settingsBlurb: 'Compact word-finding API with brief glosses.',
    goodFor: 'Compound words like CROSSBODY, less-common spellings.',
    notFor: 'Rich definitions or nuance — entries are one-line.',
    howItWorks:
      'One-line gloss-style definitions. Often the only source that has an entry for unusual compounds or informal one-offs.',
  },
  wikipedia: {
    settingsBlurb: 'Encyclopedia article summaries.',
    goodFor: 'People, places, brands, bands, films, cultural references.',
    notFor: 'Everyday vocabulary (too much context, not definitional).',
    howItWorks:
      'First two sentences of the matching Wikipedia article. The only source that reliably covers proper nouns.',
  },
  urban: {
    settingsBlurb: 'Top community definitions, sorted by upvotes.',
    goodFor: 'Slang, memes, internet-native phrases, recent coinages.',
    notFor: 'Formal or academic definitions — tone is casual.',
    howItWorks:
      'Community-submitted, upvote-sorted entries. Useful for catching terms the traditional dictionaries skip.',
  },
  wordnik: {
    settingsBlurb: 'Aggregated definitions from multiple dictionaries.',
    goodFor: 'Cross-checking a definition across several sources.',
    notFor: 'Currently unavailable — awaiting an API key.',
    howItWorks:
      'Pulls from multiple dictionaries at once. Temporarily disabled until the API key is provisioned.',
  },
}
