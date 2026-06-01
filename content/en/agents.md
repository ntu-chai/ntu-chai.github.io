---
title: Agent Environment
subtitle: AI agents, alignment sandboxes and humanist tooling
lede: The lab builds and runs AI agents in environments designed by humanists, not the other way around. Pillar 2 of the Projects, the agentic digital humanities, is implemented here.
principles:
  - letter: A
    title: "Hermeneutic loop · non-linear pipeline"
    body: Humanities research is not a single-direction stack. The workflow has to echo the back-and-forth of interpretive thinking.
    items:
      - Departs from the linear default of classic RAG
      - Foregrounds the dynamic loop of questioning and revision
      - Supports re-entry at any layer of the architecture
  - letter: B
    title: Critic agent
    body: A standing, independent Critic with its own model and toolset (reverse search, version diffing).
    items:
      - Outputs must clear the Critic before being committed to memory
      - Structural defence against hallucination
  - letter: C
    title: Mandatory provenance
    body: "Audit trail records: agent_id, prompt_hash, source_ids, version."
    items:
      - Codifying academic ethics in code
      - Claims without provenance cannot be cited by the Argue group
  - letter: D
    title: Expert agents
    body: Domain-specialised expert agents for each research family — e.g. a Philologist Agent dedicated to classical texts.
    items:
      - Refuses to feed a general-purpose LLM the raw archive
      - Brings the College of Liberal Arts's distinctive technical contribution
hermeneutic_loop:
  researcher: Researcher
  researcher_sub: questioning · judging · revising
  editor: Editor Agent
  editor_sub: planning · orchestration · state tracking
  critic: Critic Agent
  critic_sub: verify · refute · counter-hallucinate
  experts_label: Expert Agents
  experts:
    - name: Collect
      sub: corpora & cleaning
    - name: Read
      sub: close + distant reading
    - name: Interpret
      sub: translation & knowledge graph
    - name: Argue
      sub: drafting & citation
  sources_label: Sources
  sources_sub: documents · images · corpora
  memory_label: Semantic memory
  memory_sub: vector index + knowledge graph
  provenance_label: Provenance
  provenance_sub: claims & sources (attribution trace)
media:
  - placement: bottom
    kicker: CHAI Future Lab 
    title: Inside the agentic humanities lab
    src: assets/media/chai-promo-4k-trip.mp4
    alt: A short trailer-style video of the CHAI Future Lab.
    caption: A short tour of the agentic humanities lab: the people, the spaces, and the agents at work.
    credit: CHAI Future Lab · 2026 promo
---




<!-- ## Four design principles for the humanities research agent

Extended concepts from *The AI-Augmented Research Process: A Historian's Perspective*, four
principles are baked into the college-level agent OS to form the Hermeneutic loop architecture, where researcher, editor, critic and expert agents form a non-linear loop of reading, interpretation and argument. Every output carries a traceable provenance record.


## AI Alignment Sandbox

Our central agent environment is a *sandbox* in the literal sense: a contained
place where humanities scholars can poke, prod and stress-test models before
they meet the world. -->