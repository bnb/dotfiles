# Coordinator

One Claude session that keeps many others moving on my behalf. These are the words the skill and its references use.

## Language

### Sessions

**Coordinator**:
The session running this skill, responsible for scope, ownership, merge order, and what reaches me.
_Avoid_: orchestrator, manager, lead agent

**Peer session**:
A Claude session the coordinator didn't start, usually one I started myself.
_Avoid_: agent, other agent, originating session

**Worker**:
A subagent the coordinator spawned itself.
_Avoid_: agent, helper, child

**Owner**:
The one session, peer or worker, responsible for a branch or PR.
_Avoid_: author, originating agent, assignee

**Successor**:
A session that resumed or took over a dead session's work, often under a new name.

### Work

**Hold**:
An action an owner has prepared but won't take until I approve it in that owner's own session.
_Avoid_: queue, park, pending

**Burst**:
One sitting where I approve every held action, so the 1Password prompts all come while I'm at the Mac.
_Avoid_: replay window, approval round

**Ledger**:
The coordinator's durable record of owners, holds, head SHAs, and what I've been shown.
_Avoid_: notes, scratchpad, state file

**Lander**:
A PR in the merge order, counted by when it merges. The second lander of a conflicting pair resolves the conflict.

**Hot file**:
A file that many pairs of open branches conflict on, like a shared changelog.
