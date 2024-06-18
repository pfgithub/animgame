
TODO:
- [x] Onion skinning
- [x] Canned frames must be readonly
- [x] Validate all frames drawn before submit
- [x] Submit button
- [x] Play button
- [x] Review reveal logic in game.ts
- [x] Review reveal screen
- [ ] Reconnect by reloading
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

Future:
- [ ] Review guess logic in game.ts
- [ ] Review guess screen

More games to make:
- Linegame. On your turn, you can draw one line. End.