
TODO:
- [x] Onion skinning
- [x] Canned frames must be readonly
- [x] Validate all frames drawn before submit
- [x] Submit button
- [x] Play button
- [x] Review reveal logic in game.ts
- [x] Review reveal screen
- [x] Support browsers where localStorage throws an error
- [x] Reconnect by reloading
- [x] Display errors
- [x] Indicate your and other people's selections in palettes
- [ ] Button to toggle onion skinning
- [ ] Review guess logic in game.ts
  - We can do the dixit/jackbox thing for guesses:
  - Everyone writes their prompt (except the first drawer
    and the person who wrote the prompt), then people guess
    which one is real
- [ ] Review guess screen
- [ ] In a three player game, maybe have players 
- [ ] Keep in-progress drawings on reload
- [ ] Keep in-progress text fields on reload
- [ ] Display errors in a toast
- [ ] Show wait status: (5/10) if there are 10 players and
       5 have submitted. Show names of who has submitted and
       who hasn't.
- [ ] After games are over, save them and show your game history.
       We can use an access token in localstorage for that.
  - We can store a list of played game ids, and then the server can
    store game ids -> game overview screen
- [ ] Allow another client to take over a player who is disconnected
  - eg if your phone runs out of battery, you need to reconnect
    otherwise the game can't go on
  - or if you fall asleep, someone needs to take your place
- [ ] If you are in ready phase and you reload and reconnect, it uses your former UUID as your player name :/ fix this by seperating player name vs uuid in the query parameter
- [ ] Maybe: Copy the previous frame into the next frame so you don't have to redraw the whole background. Or maybe not.

Known issues:
- Because we're using websockets instead of UDP, outdated packets will queue up to be sent. This can be mitigated by checking the websocket fill amount in bun maybe? It's also probably not a problem with such a low volume of data.

More games to make:
- [ ] Linegame. On your turn, you can draw one line. End.
- [ ] Sentencegame. On your turn, you write one sentence. Next player only sees the last sentence. Make a story.
- [ ] Drawprompts. Pairs get the same prompt, each draw a thing, vote for the best.
- [x] DrawGrid : Everyone gets a prompt (choice of 3 words) and draws a
  picture. Then, all the pictures are shown in a grid (random order)
  & you gotta guess them all. Points for being guessed first & guessing
  first.
- [ ] PoisionDraw : Draw a thing. Someone else sees the drawing and writes the poision word. First person gets a little time to modify their drawing make sure people don't guess the poision word. Guessing. If you guess the real word, you get points & drawer gets points. If you guess the poison word, poisoner gets points but no one else does.

Transparent multiplayer?
- It would be nice to have a multiplayer setup in code where anyone can
  join or leave at any time and it works with no effort.

DrawGrid:
- [x] Score is backwards? `rescale(20 * 1000, 10 * 1000, 2 * 60 * 1000, 2000, 500)` outputs a number greater than 2000 for some reason
- [ ] If you click 'Give up', everyone else has the game end but you don't? Or something like that, what happened there?
- [x] Score players based on time (say 2000 points - 1000 points based on which # guesser you were, and 0 points if you give up)
- [ ] Show scores at the end
- [ ] After all drawings are completed, go to a screen that explains the next phase and has a 'ready' button. Once everyone is ready, we can do a countdown and start.