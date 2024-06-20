# ANIMGAME

A drawing game for 3-12 players (more is better)

By the end of the game, you'll have made an equal number
of mini animations as you have players.

## GAME SEQUENCE:

- Everyone joins and chooses a color palette for their prompt
- When everyone's in and has chosen palette, everyone presses 'Ready'
- Write a prompt. Other players will animate it using your color palette. Once everyone has submitted, next phase
- Look at the prompt you were assigned and draw the first two
  frames of the animation. Once everyone has submitted, next phase
- Look at the previous two frames you were given and continue them. Submit when done. Repeat until all animations are finished.
- Watch the animations. Everyone must press next to continue.
- End.

## HOW TO HOST:

1. install bun https://bun.sh

```
git clone https://github.com/pfgithub/animgame
cd server
bun src/index.ts
```

Now, use `ngrok` or similar to let other people join.

```
ngrok http http://localhost:2390
# or
cloudflared tunnel run animgame-dev
```

Code is `ABCD`

## PROJECT STATUS:

- Supports desktop & mobile, tested on Firefox. Not tested on iOS.
- It all works but error conditions aren't great yet. Don't restart
  the server while the game is running. Don't reload the page or
  turn off your phone while you're drawing animation frames. If
  you reload, you'll have to restart drawing your frames.