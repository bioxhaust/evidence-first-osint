# Reddit — draft for a permitted resource-sharing thread

Candidate: r/OSINT. Its rules endpoint returned HTTP 403 on 2026-11-03; current local rules remain unverified. Read the sidebar/rules before posting, use the designated resource thread if required, and do not submit where promotion is forbidden. General [Reddit Rules](https://redditinc.com/policies/reddit-rules) require authentic participation and no spam.

No post or moderator message has been sent. Confirm that AI-assisted drafting is allowed and revise this text in your own voice.

## Suggested title

Russian OSINT course with a real local Sherlock lab and 60 short evidence exercises

## Body

I’m sharing a project I maintain: Evidence First OSINT. Its first tasks are checking public profile links and investigating your own footprint, followed by a real GitHub-tool lab.

The Sherlock exercise installs version 0.16.2 and runs it against four synthetic localhost endpoints. One returns a real training profile, one returns a generic HTTP 200 page that causes a false match, one exposes an explicit absence marker, and one times out. You compare the actual tool output with known page behaviour. No real person or external platform is a lab target.

Tool lab:
https://bioxhaust.github.io/evidence-first-osint/practice/labs/20/

Short trainer:
https://bioxhaust.github.io/evidence-first-osint/trainer/

The course has 20 modules/labs, three checkpoint projects and a capstone. A separate trainer contains 20 units and 60 exercises with hints and explained answers. Only the Python programming/API module is optional; the required tool lab needs Python and terminal commands, but no programming.

Lessons, labs and trainer are Russian. The English overview, map, quickstart and core reference sheets/templates stand alone; the full course is not translated. For a small English example:
https://bioxhaust.github.io/evidence-first-osint/resources/quickstart.en/

Repository:
https://github.com/bioxhaust/evidence-first-osint

The full required route is estimated at 28–36 hours; trainer practice adds roughly 2–3 hours. These are editorial estimates, not measured outcomes. Original prose and fixtures are CC BY 4.0; original code is MIT.

I would appreciate specific feedback on a step that cannot be reproduced, a false-positive explanation that is unclear, or a conclusion stronger than its evidence.
