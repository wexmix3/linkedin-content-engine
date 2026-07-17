import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a LinkedIn ghostwriter for Max Wexley, founder of Wex Advisory — an AI consulting practice for small to mid-market businesses.

Max's voice: Direct. No corporate fluff. Real stories. Specific numbers when possible. Casual professional. First-person. Ends with a hook or question occasionally. No hashtag spam (1-2 max, sometimes none). Posts are 150-300 words. Never start with "I".

Context about Max's work:
- Wex Advisory: boutique AI consulting, personal touch is the moat, $150/hr + $300/mo subscription model
- 25N Coworking: first client, built occupancy Excel dashboards + PDF reports that save the CFO 3 hours/week. Deal pending CFO return from vacation.
- Tools built: AI Audit tool (free lead-gen), Competitor Analysis tool ($149 flat fee, 13-page PDF in 60 seconds), Cold Outreach pipeline
- Background: Finance analyst at BBVA, Michigan '24, NYC, self-taught builder, 7+ projects alongside day job

Generate a single LinkedIn post. Do not add any preamble or explanation — just the post text itself.`

// Condensed scoring gate — same idea as Content Eval's 7-expert panel and /roast's
// council, sized down to one Haiku call for a single post instead of a multi-agent
// dispatch. Catches generic drafts before Max ever sees them in the queue.
const SCORE_PROMPT = `Score this LinkedIn post draft on four criteria, 0-100 each:
- hook: does the first line stop a scroll on its own, without needing the rest of the post?
- specificity: does it include a real number, before/after, or concrete detail — not generic "shipped a feature" framing?
- voice_match: direct, no corporate throat-clearing ("Excited to share...", "Thrilled to announce..."), doesn't start with "I"?
- platform_fit: 150-300 words, no hashtag spam (0-2 max)?

Post:
---
{post}
---

Reply with JSON only: {"hook": <int>, "specificity": <int>, "voice_match": <int>, "platform_fit": <int>, "weakest": "<criterion name>"}`

interface ScoreResult {
  hook: number
  specificity: number
  voice_match: number
  platform_fit: number
  weakest: string
}

function extractJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in score response')
  return JSON.parse(match[0]) as T
}

async function scorePost(post: string): Promise<ScoreResult | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: SCORE_PROMPT.replace('{post}', post) }],
    })
    const content = message.content[0]
    if (content.type !== 'text') return null
    return extractJson<ScoreResult>(content.text)
  } catch {
    // Scoring is a quality gate, not a hard dependency — never block the generate
    // flow on a Haiku hiccup.
    return null
  }
}

function averageScore(s: ScoreResult): number {
  return (s.hook + s.specificity + s.voice_match + s.platform_fit) / 4
}

const SCORE_GATE_THRESHOLD = 70

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { mode, context_tag, raw_input } = body

  if (!mode || (mode !== 'auto' && mode !== 'manual')) {
    return NextResponse.json({ error: 'mode must be auto or manual' }, { status: 400 })
  }

  if (mode === 'auto' && !context_tag) {
    return NextResponse.json({ error: 'context_tag required for auto mode' }, { status: 400 })
  }

  if (mode === 'manual' && !raw_input) {
    return NextResponse.json({ error: 'raw_input required for manual mode' }, { status: 400 })
  }

  const userMessage =
    mode === 'auto'
      ? `Write a LinkedIn post about: ${context_tag}`
      : `Write a LinkedIn post based on these notes: ${raw_input}`

  try {
    const generate = async (extraInstruction?: string) => {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage },
          ...(extraInstruction ? [{ role: 'user' as const, content: extraInstruction }] : []),
        ],
      })
      const content = message.content[0]
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
      return content.text
    }

    let draft = await generate()
    let score = await scorePost(draft)

    // One silent rewrite pass if the draft is weak — mirrors x-engine's gate.
    // Never blocks the response on a second failed attempt; ship the best draft.
    if (score && averageScore(score) < SCORE_GATE_THRESHOLD) {
      const rewritten = await generate(
        `That draft scored weak on ${score.weakest}. Rewrite it — same topic, fix that specifically, keep everything else that worked.`
      )
      const rewrittenScore = await scorePost(rewritten)
      if (!rewrittenScore || averageScore(rewrittenScore) >= averageScore(score)) {
        draft = rewritten
        score = rewrittenScore
      }
    }

    return NextResponse.json({ content: draft })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
