export type Definition = {
  definition: string
  partOfSpeech?: string
  source?: string
}

export type DefinitionResult = {
  definitions: Array<Definition>
  source?: string
}

export async function tryDictionaryApi(
  word: string,
): Promise<DefinitionResult | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const allDefinitions: Array<Definition> = []
    for (const entry of data) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (def.definition) {
            allDefinitions.push({
              definition: def.definition,
              partOfSpeech: meaning.partOfSpeech,
              source: 'dictionary',
            })
          }
        }
      }
    }
    return allDefinitions.length > 0
      ? { definitions: allDefinitions, source: 'dictionary' }
      : null
  } catch {
    return null
  }
}

export async function tryDatamuse(
  word: string,
): Promise<DefinitionResult | null> {
  try {
    const res = await fetch(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const def = data[0]?.defs?.[0]
    if (!def) return null
    const parts = def.split('\t')
    return {
      definitions: [{ definition: parts[1] ?? parts[0], source: 'datamuse' }],
      source: 'datamuse',
    }
  } catch {
    return null
  }
}

export async function tryWikipedia(
  word: string,
): Promise<DefinitionResult | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.extract || data.extract.length <= 10) return null
    const extract = data.extract.split('. ').slice(0, 2).join('. ') + '.'
    return {
      definitions: [
        {
          definition: extract,
          partOfSpeech: 'proper noun',
          source: 'wikipedia',
        },
      ],
      source: 'wikipedia',
    }
  } catch {
    return null
  }
}

export async function tryUrbanDictionary(
  word: string,
): Promise<DefinitionResult | null> {
  try {
    const res = await fetch(
      `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.list || data.list.length === 0) return null
    const defs = data.list
      .slice()
      .sort((a, b) => b.thumbs_up - a.thumbs_up)
      .slice(0, 3)
      .map((d) => ({
        definition: d.definition.replace(/\[|\]/g, ''),
        partOfSpeech: 'slang',
        source: 'urban',
      }))
    return { definitions: defs, source: 'urban' }
  } catch {
    return null
  }
}

export function generateFallback(word: string): DefinitionResult {
  if (!word || word.trim().length === 0) {
    return {
      definitions: [
        { definition: 'Unknown word or term.', source: 'inferred' },
      ],
      source: 'inferred',
    }
  }
  const original = word
  const w = word.toLowerCase()

  const mk = (def: string): DefinitionResult => ({
    definitions: [{ definition: def, source: 'inferred' }],
    source: 'inferred',
  })

  if (w.endsWith('er'))
    return mk(
      `One who ${w.slice(0, -2)}s or something that ${w.slice(0, -2)}s.`,
    )
  if (w.endsWith('ing'))
    return mk(
      `The act of ${w.slice(0, -3)}ing; present participle of ${w.slice(0, -3)}.`,
    )
  if (w.endsWith('tion') || w.endsWith('sion'))
    return mk('A state, action, or process.')
  if (w.endsWith('ness'))
    return mk(`The quality or state of being ${w.slice(0, -4)}.`)
  if (w.endsWith('ly')) return mk(`In a ${w.slice(0, -2)} manner; adverb form.`)
  if (original[0] === original[0].toUpperCase()) {
    return mk(
      'Proper noun - may refer to a person, place, brand, or cultural reference.',
    )
  }
  return mk('Word or term - context needed for specific meaning.')
}

export async function fetchDefinitionWithFallbacks(
  word: string,
  originalWord: string,
): Promise<DefinitionResult> {
  return (
    (await tryDictionaryApi(word)) ??
    (await tryDatamuse(word)) ??
    (await tryWikipedia(originalWord)) ??
    (await tryUrbanDictionary(word)) ??
    generateFallback(originalWord)
  )
}
