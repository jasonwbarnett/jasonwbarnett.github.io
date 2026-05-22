---
layout: post
title: "Anthropic ships fast: from feature request to merged in days"
category: posts
---

This is a story about what good developer support looks like, and why it makes me believe Anthropic isn't just going to be around in twelve months, but is the kind of company that compounds over time.

## The problem: tmux-resurrect and Claude sessions

I use [tmux-resurrect][1] to save and restore my terminal sessions across reboots. It works beautifully for most things, but Claude Code sessions were a persistent headache.

The dream is simple: close the laptop, open it the next morning, run a restore, and have your Claude windows reopen with `claude --resume <session-id>` exactly where they left off. The reality was that I had accumulated about 140 lines of increasingly baroque shell heuristics to make this work:

- Encode the working directory into the window name so I had something to decode on restore
- Correlate JSONL files by birth time to guess which session belonged to which process
- Exclude any UUID-looking strings that looked "claimed" by another process
- Cap the time window to avoid picking up stale sessions

It was fragile. Four scenarios I cared about still failed regularly, including the case where two live Claude processes legitimately shared one session (which is valid: `--resume` lets you attach multiple terminals to the same session).

## The accidental discovery

I was about to file a feature request for "some way to introspect running Claude sessions" when I decided to poke around the filesystem first. I found `~/.claude/sessions/<pid>.json`:

```json
{
  "pid": 70927,
  "sessionId": "956af9b5-808e-47a1-8278-bea9dc679d5e",
  "cwd": "/home/coder",
  "startedAt": 1778933953596,
  "procStart": "8715888",
  "version": "2.1.143",
  "peerProtocol": 1,
  "kind": "interactive",
  "entrypoint": "cli",
  "status": "idle",
  "updatedAt": 1778933953487,
  "bridgeSessionId": "session_01JAoSBnhk14tdaFsa49cxQ1"
}
```

It's written at startup; I verified it exists even for a bare-launched Claude that hasn't received its first prompt. Every live Claude on my machine has one. And `sessionId` matches the `--resume` argument exactly.

My tmux-resurrect strategy went from ~140 lines down to ~70:

```
read /proc/<pid>/stat tpgid
→ read ~/.claude/sessions/<pid>.json
→ splice --resume <sessionId> into the restore command
```

All four failing scenarios resolved. The shared-session case worked correctly because the file is per-pid, not per-session.

## What I actually asked support

Even though the discovery solved the immediate problem, I had real questions before I could depend on this in tooling:

1. **Documentation**: is this a supported surface, or did I just stumble onto an internal file?
2. **Schema stability**: are `pid` and `sessionId` committed field names, or could they be renamed?
3. **Cleanup semantics**: if a Claude process segfaults, when does its file disappear?

I also mentioned a couple of nice-to-haves: a `claude session list --running --json` subcommand that would save every consumer from reimplementing the directory-scan + pid-liveness dance, and surfacing the `--name` flag in the pidfile for status bars.

## The response, and what happened next

The reply from the Claude Code team came with exactly the detail I needed:

- Those files power Claude's internal agent and cross-session messaging. Not a documented API today, but `pid` and `sessionId` have been present since the files were introduced in March and every internal consumer depends on them; stable in practice.
- Cleanup is both: on clean exit the file is removed; on crash it survives until the next Claude launch, which sweeps any file whose pid is dead. (`procStart` is the pid-reuse guard, which is why it's in the schema; pid recycling is a real concern on long-running systems.)
- They'd raise the documentation + additive-only ask with the team.

Less than 24 hours later, a follow-up: **"we just merged `claude agents --json` as the supported scripting surface for this, should ship on Tuesday."**

The `--json` output gives you `pid` and `sessionId` with an additive-only commitment and already filters to live processes, so consumers don't need to think about cleanup at all.

I filed a support thread on a Saturday morning. By Tuesday, three days later, a new subcommand was merged and on its way to shipping. That's a turnaround I'd expect from a three-person startup, not a company building frontier AI models at scale.

## Why this matters beyond the feature

The speed is impressive. But what actually signals something deeper is *how* it happened.

The team member I talked to didn't just answer my questions. They explained the internal design (why the files exist, what `procStart` is for), flagged the limitation honestly ("not a documented API today"), and then brought the ask to the right people rather than closing the ticket. And whoever picked it up on the other end decided "this is worth a first-class CLI surface" rather than just writing a doc comment and calling it done.

That's a specific kind of organizational behavior that's hard to fake: people who understand their system deeply, communicate that understanding clearly, and have enough latitude to turn a user request into a real improvement quickly. It's the kind of thing that's either baked into how a company operates or it isn't, and you can't bolt it on later.

I've worked with a lot of developer tools over the years. The ones that compound, the ones that are still the dominant choice five years after they launched, almost always have this quality early: they treat the gap between "user found a workaround" and "user has a real API" as a bug, not a feature request backlog item.

Anthropic does that. And that's why I think they're not just going to succeed this year. They're building the kind of institutional behavior that wins for a long time.

---

If you want to see the tmux-resurrect strategy, I'll write it up in a follow-on post. The happy path is now a single `claude agents --json` call; the old heuristic pile is still there as a fallback for older Claude versions, but the common case is clean.

[1]: https://github.com/tmux-plugins/tmux-resurrect
