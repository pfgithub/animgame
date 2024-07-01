
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
- [x] Don't gray out when you switch to other frames
- [x] Add 'COPY' mode where you don't have to redraw every frame
- [x] Add animation speed slider in review (it won't be an image tag anymore but we can add a download link)
- [x] Add download button in review (svg for now)
- [x] Keep in-progress drawings on reload
- [x] Default to redraw mode
- [ ] Rename 'Everyone's In' back to 'Ready'
- [ ] In 'REDRAW' mode, add a button to toggle onion skin
- [ ] In 'COPY' mode, make sure to not keep increasing the amount of data in the
       frames. We can have the server send frame history instead.
- [ ] Add a game config toggle switch to enable the pixelated rendering mode. Or add it in the playback stage.
- [ ] Change line size buttons to be little circles instead of numbers
- [ ] Indicate which frames are yours and which aren't
- [ ] Show total frame count
- [ ] Keep in-progress text fields on reload
- [ ] Display errors in a toast
- [ ] Show wait status: (5/10) if there are 10 players and
       5 have submitted. Show names of who has submitted and
       who hasn't.
- [ ] Add a final 'review' screen that shows every animation with download links and who's prompt and such
- [ ] After games are over, save them to history. Players can view the game by its UUID (saved in localstorage) and see the review screen.
- [ ] Allow another client to take over a player who is disconnected
  - eg if your phone runs out of battery, you need to reconnect
    otherwise the game can't go on
  - or if you fall asleep, someone needs to take your place
- [ ] If you are in ready phase and you reload and reconnect, it uses your former UUID as your player name :/ fix this by seperating player name vs uuid in the query parameter
- [ ] It may be possible to go in a pattern that isn't a circle. Some kind of way to say "who's worked on the drawing so far" - find who hasn't yet and pick randomly. and preserve that the prompt author goes last. maybe.
- [ ] Show the color palette you selected on your prompt screen
- [ ] Help text for new players.
- [ ] Fix the bug that when a player disconnects their color palette isn't freed until someone switches palettes
- [ ] Discord activities developer preview? Add to interpunct-app-games?
- [ ] Rename 'Everyone's in' back to 'Ready'
- [ ] Rename 'Reset' back to 'Clear'
- [ ] REMOVE Onion skinning on frames you didn't draw!
- [ ] Make palettes have more distinct colors to be easier to differentiate
- [ ] More compatible download format
- [ ] Speed slider is backwards - also make it a log scale
- [ ] Pause for a sec at the end of the anim?
- [ ] Could make a mode where the last person sees the last frame and first frame and puts a frame in between to make it loop

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
- [ ] PanoramaGame : You draw a frame. The next person has your frame left and continues it right. Repeat n times. Show the panoramas at the end. Or same thing with zooming out or zooming in
  - OOh it could be cool with zooming out, and then inversing it at the end to make
    an animation zooming in. It would be like 50% of the frame and then you draw in there. And the inner parts are hidden, they're just filled a solid color.

Transparent multiplayer?
- It would be nice to have a multiplayer setup in code where anyone can
  join or leave at any time and it works with no effort.

DrawGrid:
- [x] Score is backwards? `rescale(20 * 1000, 10 * 1000, 2 * 60 * 1000, 2000, 500)` outputs a number greater than 2000 for some reason
- [x] BUG: If you click 'Give up', everyone else has the game end but you don't? Or something like that, what happened there?
- [x] ~~Score players based on time (say 2000 points - 1000 points based on which # guesser you were, and 0 points if you give up)~~ superseeded
- [x] Show scores at the end
- [x] Score based on what # you got the image. Score the same for which images are guessed first for the author points
- [ ] After all drawings are completed, go to a screen that explains the next phase and has a 'ready' button. Once everyone is ready, we can do a countdown and start.
- [ ] Show who has guessed which images


Deployment:
- [ ] This is how we load balance https://www.gamedev.net/forums/topic/710030-connecting-players-to-the-same-server-if-they-are-in-the-same-match/
  - Basically the easy way is making a subdomain per server, and having the webserver choose which subdomain to send you to based on your game id.
- [ ] Maybe add branding to downloaded SVGs? Some kind of bar at the bottom that says like 'Prompt by <name>' and has the game title so you can gooble search
- [ ] https://docs.colyseus.io/#next-steps Colysius might handle this? It's designed for react, but that's okay

Gobal:

- [ ] Make a simple jsx or function call reactive ui lib, or use react or solid js
- [ ] Migrate to tailwind | unocss
- [ ] Implement game creation on the server. Just has to do validation, create game, and return the specified data