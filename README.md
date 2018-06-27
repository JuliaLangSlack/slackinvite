# Julia Slack

Webapp powering the [Julia slack invite page](https://slackinvite.julialang.org).

Also powers the **Malmabot** Slack application, used in the Julia slack.

# Deployment notes

1. Create the database. It needs the following tables:

* invites
* sessions
* status_changes
* admins
* slack_tokens

2. Create the slack token entry in the rethink REPL:

`r.db('juliaslack').table('slack_tokens').insert({'user_id': 'U66K46L49', 'token': '{secret token from 1password'})`
