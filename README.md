# CipherState
An interactive Theory of Computation investigation lab. Node serves the console and passes each investigation to a compiled C++17 engine. The browser draws the returned construction steps and transitions.

## Run locally
Install Node.js 18 or later with npm, and a C++17 compiler named g++ on PATH (on Windows, MinGW-w64 g++ works). Extract the entire ZIP. In VS Code, open the folder containing package.json, then open Terminal and run:

    npm start

Open http://localhost:3000 and select First Intercept. The first start compiles the engine. No npm install is needed. Stop with Ctrl+C. Set CXX to an alternative C++ compiler executable if needed. Run npm test for the five mission checks and regex edge cases.

## How to investigate
Enter the alphabet and regex, then run analysis. Switch simulation phases and use Play, Pause, Next and Reset. Inspect the evidence, edit your answer and run it again. Submit a correct investigation to unlock the next case. Progress belongs to this local installation and is saved in data/progress.json. Previously closed missions remain playable.

## Viva walkthrough (contains solutions)

| Case | Demonstration |
|---|---|
| First Intercept | Enter alphabet XKAM7294 and try regex X7. Inspect the counterexample, then try X7\|K2\|A9\|M4. The token transducer loops on S with outputs X7/H, K2/E, A9/L and M4/P. The intercept produces HELP. |
| Corrupted Transmission | Run the supplied packet. The final 9A token fails because it starts with a digit. Change it to A9 and recover PEEL. |
| Missing Automaton | For binary words ending in 1, use q0 as the rejecting start and q1 as accepting. From either state send 0 to q0 and 1 to q1. |
| Counterexample Hunt | The supplied DFA accepts 1 while the reference rejects it. Add q2. Use q0 as start and q2 as the only accepting state. From q0, q1, q2 send 0 to q1. On 1 send them respectively to q0, q2, q0. |
| Cipher Wheel Mystery | Use starting positions 2, 1, 9. The three cyclic pin sequences generate one key bit per step. Inspect the Mealy output view and read OPEN. |

## Explaining the algorithms
* **Thompson construction.** The recursive-descent parser handles literals, explicit epsilon (~), grouping, union, concatenation and Kleene star. Each fragment has an entry and exit. Concatenation adds an epsilon link. Union creates an entry with two choices and a shared exit. Star provides a bypass and a loop. Each recorded step gives the new fragment and edge count.
* **Subset construction.** Start with the epsilon closure of the NFA entry. For each symbol, move from every member, then take epsilon closure again. Reuse identical subsets. A subset accepts if it contains the NFA exit. The empty subset is a rejecting sink. Step captions show the move and closure.
* **Validation.** Split the intercept on hyphens and restart the candidate DFA for each token. Keep the sequence of states, including a rejecting sink for missing transitions. A token accepts only if its final state accepts. In builder missions the token trace uses the student's machine, while the construction views explain the reference regex.
* **Equivalence.** BFS explores reachable state pairs over the union alphabet, treating absent transitions as sink transitions. A pair with different acceptance determines a distinguishing word. Following parent links reconstructs a shortest counterexample, possibly epsilon. Exhausting the queue proves equivalence.
* **Token Mealy machine.** A validated token is one input symbol to the one-state transducer. Its outgoing transition emits one letter from the mission's JSON codebook. Changing token order changes output order. A rejected or unmapped token suppresses the final plaintext.
* **Wheel Mealy machine.** Adapted from mode1.cpp in the team's Cyber Security project. Its cyclic indexing, three pin sequences, XOR combination and most-significant-bit-first byte order are retained. State is the tuple of wheel indices; every transition advances each index modulo its wheel length. Output equals input XOR the three current pin bits. The finite state space has at most 5 × 7 × 11 tuples. Wheel 2 position 1 is the normalized original offset 8. This mission uses the simplified teaching model.

## Source map
* engine/main.cpp — Thompson parser, subset construction, DFA tracing, product BFS and transducers.
* server.js — local HTTP server, compiler startup, engine protocol and mission submission.
* data/missions.json — mission briefs, intercepts, regex rules, mappings and wheel pins.
* public/ — dashboard, SVG visualization, state editor and playback.
* test.js — executable mission solutions and regression checks.

For responsive classroom demos the app accepts up to 100 regex characters, 256 generated DFA states, 32 editor states and 200 printable message characters. Wheel input must contain whole bytes. Non-printable decoded bytes appear as question marks.
